# Add to your views.py
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from django.db import transaction
from django.utils import timezone
import json
from django.db import models
from web3.models import UserWallet
from hiero_sdk_python import (
    AccountId,
)
import logging
from hiero.utils import create_new_account
from hiero.ft import associate_token
from .models import CommunityProposal, ProposalVote, CommunityEvent, EventParticipant, GovernanceBadge, PlayerGovernanceStats
from gameEngine.models import PlayerProfile

@csrf_exempt
@require_http_methods(["GET"])
def api_community_proposals(request):
    """Get all community proposals"""
    try:
        proposals = CommunityProposal.objects.all().select_related('created_by__user')
        
        proposals_data = []
        for proposal in proposals:
            # Check if user has voted
            user_vote = None
            if request.user.is_authenticated:
                try:
                    player_profile = PlayerProfile.objects.get(user=request.user)
                    vote = ProposalVote.objects.filter(proposal=proposal, voter=player_profile).first()
                    if vote:
                        user_vote = vote.vote
                except PlayerProfile.DoesNotExist:
                    pass
            
            proposals_data.append({
                'id': proposal.id,
                'title': proposal.title,
                'description': proposal.description,
                'proposal_type': proposal.proposal_type,
                'status': proposal.status,
                'created_by': {
                    'username': proposal.created_by.user.username,
                    'avatar': proposal.created_by.avatar
                },
                'created_at': proposal.created_at.isoformat(),
                'voting_start': proposal.voting_start.isoformat() if proposal.voting_start else None,
                'voting_end': proposal.voting_end.isoformat() if proposal.voting_end else None,
                'total_votes': proposal.total_votes,
                'yes_votes': proposal.yes_votes,
                'no_votes': proposal.no_votes,
                'abstain_votes': proposal.abstain_votes,
                'approval_rate': proposal.approval_rate,
                'days_remaining': proposal.days_remaining,
                'user_vote': user_vote,
                'required_approval': proposal.required_approval
            })
        
        return JsonResponse(proposals_data, safe=False)
        
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to load proposals: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def api_create_proposal(request):
    """Create a new community proposal"""
    try:
        data = json.loads(request.body)
        player_profile = PlayerProfile.objects.get(user=request.user)
        
        title = data.get('title')
        description = data.get('description')
        proposal_type = data.get('proposal_type', 'feature')
        
        if not title or not description:
            return JsonResponse({
                'error': 'Title and description are required'
            }, status=400)
        
        # Check if player can create proposals (minimum level 2)
        if player_profile.level < 2:
            return JsonResponse({
                'error': 'Level 2 required to create proposals'
            }, status=400)
        
        proposal = CommunityProposal.objects.create(
            title=title,
            description=description,
            proposal_type=proposal_type,
            created_by=player_profile,
            status='draft'
        )
        
        # Update governance stats
        stats, created = PlayerGovernanceStats.objects.get_or_create(player=player_profile)
        stats.proposals_created += 1
        stats.save()
        
        # Check for badge unlocks
        check_governance_badges(player_profile)
        
        return JsonResponse({
            'success': True,
            'message': 'Proposal created successfully',
            'proposal_id': proposal.id
        })
        
    except PlayerProfile.DoesNotExist:
        return JsonResponse({
            'error': 'Player profile not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to create proposal: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def api_vote_proposal(request, proposal_id):
    """Vote on a community proposal"""
    try:
        data = json.loads(request.body)
        player_profile = PlayerProfile.objects.get(user=request.user)
        
        proposal = CommunityProposal.objects.get(id=proposal_id)
        vote_type = data.get('vote')  # 'yes', 'no', 'abstain'
        
        if vote_type not in ['yes', 'no', 'abstain']:
            return JsonResponse({
                'error': 'Invalid vote type'
            }, status=400)
        
        if proposal.status != 'active':
            return JsonResponse({
                'error': 'Voting is not active for this proposal'
            }, status=400)
        
        if proposal.voting_end and timezone.now() > proposal.voting_end:
            return JsonResponse({
                'error': 'Voting period has ended'
            }, status=400)
        
        # Calculate voting power based on player's equity and level
        voting_power = calculate_voting_power(player_profile)
        
        # Create or update vote
        vote, created = ProposalVote.objects.update_or_create(
            proposal=proposal,
            voter=player_profile,
            defaults={
                'vote': vote_type,
                'voting_power': voting_power
            }
        )
        
        # Update proposal vote counts
        proposal.total_votes = ProposalVote.objects.filter(proposal=proposal).count()
        proposal.yes_votes = ProposalVote.objects.filter(proposal=proposal, vote='yes').count()
        proposal.no_votes = ProposalVote.objects.filter(proposal=proposal, vote='no').count()
        proposal.abstain_votes = ProposalVote.objects.filter(proposal=proposal, vote='abstain').count()
        
        # Check if proposal passed
        if proposal.approval_rate >= proposal.required_approval:
            proposal.status = 'passed'
        
        proposal.save()
        
        # Update governance stats
        stats, created = PlayerGovernanceStats.objects.get_or_create(player=player_profile)
        stats.votes_cast += 1
        stats.total_voting_power += voting_power
        stats.save()
        
        # Add XP for participation
        player_profile.xp += 25
        player_profile.save()
        
        # Check for badge unlocks
        check_governance_badges(player_profile)
        
        return JsonResponse({
            'success': True,
            'message': 'Vote recorded successfully',
            'voting_power': voting_power,
            'xp_earned': 25
        })
        
    except CommunityProposal.DoesNotExist:
        return JsonResponse({
            'error': 'Proposal not found'
        }, status=404)
    except PlayerProfile.DoesNotExist:
        return JsonResponse({
            'error': 'Player profile not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to vote: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def api_community_events(request):
    """Get upcoming community events"""
    try:
        events = CommunityEvent.objects.filter(
            scheduled_for__gte=timezone.now(),
            is_active=True
        ).select_related('host__user')
        
        events_data = []
        for event in events:
            # Check if user is registered
            is_registered = False
            if request.user.is_authenticated:
                try:
                    player_profile = PlayerProfile.objects.get(user=request.user)
                    is_registered = EventParticipant.objects.filter(
                        event=event, 
                        player=player_profile
                    ).exists()
                except PlayerProfile.DoesNotExist:
                    pass
            
            events_data.append({
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'event_type': event.event_type,
                'scheduled_for': event.scheduled_for.isoformat(),
                'duration_minutes': event.duration_minutes,
                'host': {
                    'username': event.host.user.username,
                    'avatar': event.host.avatar
                },
                'max_participants': event.max_participants,
                'current_participants': event.participants.count(),
                'is_registered': is_registered
            })
        
        return JsonResponse(events_data, safe=False)
        
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to load events: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def api_join_event(request, event_id):
    """Join a community event"""
    try:
        player_profile = PlayerProfile.objects.get(user=request.user)
        event = CommunityEvent.objects.get(id=event_id)
        
        if not event.is_active:
            return JsonResponse({
                'error': 'Event is not active'
            }, status=400)
        
        if event.participants.count() >= event.max_participants:
            return JsonResponse({
                'error': 'Event is full'
            }, status=400)
        
        # Create participation
        participant, created = EventParticipant.objects.get_or_create(
            event=event,
            player=player_profile
        )
        
        if created:
            # Update governance stats
            stats, created = PlayerGovernanceStats.objects.get_or_create(player=player_profile)
            stats.events_attended += 1
            stats.save()
            
            # Add XP for participation
            player_profile.xp += 50
            player_profile.save()
            
            # Check for badge unlocks
            check_governance_badges(player_profile)
        
        return JsonResponse({
            'success': True,
            'message': 'Successfully joined event',
            'xp_earned': 50 if created else 0
        })
        
    except CommunityEvent.DoesNotExist:
        return JsonResponse({
            'error': 'Event not found'
        }, status=404)
    except PlayerProfile.DoesNotExist:
        return JsonResponse({
            'error': 'Player profile not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to join event: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
@login_required
def api_governance_stats(request):
    """Get player's governance statistics"""
    try:
        player_profile = PlayerProfile.objects.get(user=request.user)
        stats, created = PlayerGovernanceStats.objects.get_or_create(player=player_profile)
        
        return JsonResponse({
            'proposals_created': stats.proposals_created,
            'votes_cast': stats.votes_cast,
            'events_attended': stats.events_attended,
            'successful_proposals': stats.successful_proposals,
            'total_voting_power': stats.total_voting_power,
            'governance_level': stats.governance_level,
            'participation_rate': stats.participation_rate,
            'last_activity': stats.last_activity.isoformat()
        })
        
    except PlayerProfile.DoesNotExist:
        return JsonResponse({
            'error': 'Player profile not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to load governance stats: {str(e)}'
        }, status=500)

# Utility functions
def calculate_voting_power(player_profile):
    """Calculate voting power based on player's status"""
    base_power = 1.0
    equity_bonus = player_profile.total_equity * 0.1  # 0.1 power per 1% equity
    level_bonus = player_profile.level * 0.5  # 0.5 power per level
    
    return base_power + equity_bonus + level_bonus

def check_governance_badges(player_profile):
    """Check and unlock governance-related badges"""
    try:
        stats, created = PlayerGovernanceStats.objects.get_or_create(player=player_profile)
        
        # Define badge requirements
        badge_requirements = [
            {'type': 'proposals_created', 'value': 1, 'name': 'First Proposal'},
            {'type': 'votes_cast', 'value': 5, 'name': 'Active Voter'},
            {'type': 'events_attended', 'value': 3, 'name': 'Community Participant'},
            {'type': 'successful_proposals', 'value': 1, 'name': 'Change Maker'},
        ]
        
        for requirement in badge_requirements:
            badge_value = getattr(stats, requirement['type'], 0)
            if badge_value >= requirement['value']:
                # Create or get badge
                badge, created = GovernanceBadge.objects.get_or_create(
                    name=requirement['name'],
                    defaults={
                        'icon': '🏆',
                        'description': f'{requirement["type"].replace("_", " ")}: {requirement["value"]}',
                        'requirement_type': requirement['type'],
                        'requirement_value': requirement['value'],
                        'reward_xp': 100,
                        'reward_tickets': 5,
                        'reward_stars': 25
                    }
                )
                
                # Award badge to player (you'd need a PlayerGovernanceBadge model for this)
                # This is simplified - in practice you'd create a relationship model
                
    except Exception as e:
        print(f"Error checking governance badges: {e}")


