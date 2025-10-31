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


# wallet/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
import json
from .models import UserWallet
from gameEngine.models import HederaTransaction as Transaction
from hiero.ft import transfer_tokens
from hiero.mirror_node import get_balance

@login_required
def wallet_overview(request):
    """Get wallet overview data"""
    try:
        user_wallet = get_object_or_404(UserWallet, user=request.user)
        
        # Get balances
        starpoints = get_balance(user_wallet.recipient_id)
        
        # Get recent transactions
        recent_transactions = Transaction.objects.filter(
            wallet=user_wallet
        ).order_by('-created_at')[:10]
        
        return JsonResponse({
            'success': True,
            'wallet_data': {
                'starpoints': starpoints,
                'recipient_id': user_wallet.recipient_id,
                'account_id': user_wallet.account_id,
                'tickets': user_wallet.get_ticket_count(),
                'coins': user_wallet.coins_balance,
            },
            'recent_transactions': [
                {
                    'id': tx.id,
                    'type': tx.transaction_type,
                    'amount': tx.amount,
                    'value': f"${abs(tx.amount * 0.10):.2f}",
                    'date': tx.get_time_ago(),
                    'icon': tx.get_icon(),
                    'status': tx.status
                } for tx in recent_transactions
            ]
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def hedera_data(request):
    """Get Hedera-specific data"""
    try:
        user_wallet = get_object_or_404(UserWallet, user=request.user)
        
        starpoints = get_balance(user_wallet.recipient_id)
        
        # Get Hedera transactions
        hedera_transactions = Transaction.objects.filter(
            wallet=user_wallet,
            transaction_type__in=['STA_PURCHASE', 'STA_TRANSFER', 'STA_REWARD']
        ).order_by('-created_at')[:5]
        
        return JsonResponse({
            'success': True,
            'hedera_data': {
                'account_id': user_wallet.account_id,
                'recipient_id': user_wallet.recipient_id,
                'balance': starpoints,
                'network': 'Hedera Mainnet'
            },
            'transactions': [
                {
                    'type': tx.get_display_type(),
                    'amount': f"{'+' if tx.amount > 0 else ''}{tx.amount} STA",
                    'date': tx.get_time_ago(),
                    'transaction_hash': tx.transaction_hash
                } for tx in hedera_transactions
            ]
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def buy_starpoints(request):
    """Purchase STA tokens"""
    try:
        data = json.loads(request.body)
        amount = int(data.get('amount', 0))
        
        if amount < 10:
            return JsonResponse({
                'success': False,
                'error': 'Minimum purchase is 10 STA'
            })
        
        user_wallet = get_object_or_404(UserWallet, user=request.user)
        
        # Process token transfer (this would integrate with your payment system)
        process_buy = transfer_tokens(
            recipient_id=user_wallet.recipient_id, 
            amount=amount * 100  # Adjust for decimals
        )
        
        if process_buy['status'] == "failed":
            return JsonResponse({
                'success': False,
                'error': 'Failed to transfer STA. Please try again later.'
            })
        
        # Record transaction
        Transaction.objects.create(
            wallet=user_wallet,
            transaction_type='STA_PURCHASE',
            amount=amount,
            transaction_hash=process_buy.get('transaction_hash'),
            status='completed'
        )
        
        return JsonResponse({
            'success': True,
            'message': f'{amount} STA transferred successfully to your account!',
            'transaction_hash': process_buy.get('transaction_hash')
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def send_starpoints(request):
    """Send STA tokens to another user"""
    try:
        data = json.loads(request.body)
        recipient_id = data.get('recipient_id')
        amount = int(data.get('amount', 0))
        memo = data.get('memo', '')
        
        if not recipient_id or amount <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Invalid recipient or amount'
            })
        
        user_wallet = get_object_or_404(UserWallet, user=request.user)
        
        # Check balance
        current_balance = get_balance(user_wallet.recipient_id)
        if current_balance < amount:
            return JsonResponse({
                'success': False,
                'error': f'Insufficient balance. You have {current_balance} STA'
            })
        
        # Process transfer (this would use Hedera token transfer)
        transfer_result = transfer_tokens(
            recipient_id=recipient_id,
            amount=amount * 100,  # Adjust for decimals
            memo=memo
        )
        
        if transfer_result['status'] == "failed":
            return JsonResponse({
                'success': False,
                'error': 'Transfer failed. Please try again.'
            })
        
        # Record transaction
        Transaction.objects.create(
            wallet=user_wallet,
            transaction_type='STA_TRANSFER',
            amount=-amount,  # Negative for outgoing
            transaction_hash=transfer_result.get('transaction_hash'),
            metadata={
                'recipient': recipient_id,
                'memo': memo
            },
            status='completed'
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully sent {amount} STA to {recipient_id}',
            'transaction_hash': transfer_result.get('transaction_hash')
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def transaction_history(request):
    """Get transaction history with filtering"""
    try:
        filter_type = request.GET.get('filter', 'all')
        user_wallet = get_object_or_404(UserWallet, user=request.user)
        
        transactions = Transaction.objects.filter(wallet=user_wallet)
        
        # Apply filters
        if filter_type != 'all':
            if filter_type == 'sta':
                transactions = transactions.filter(transaction_type='STA_PURCHASE')
            elif filter_type == 'tickets':
                transactions = transactions.filter(transaction_type='TICKET_PURCHASE')
            elif filter_type == 'hedera':
                transactions = transactions.filter(transaction_type__in=['STA_TRANSFER', 'STA_REWARD'])
            elif filter_type == 'rewards':
                transactions = transactions.filter(transaction_type='REWARD')
        
        transactions = transactions.order_by('-created_at')[:20]
        
        return JsonResponse({
            'success': True,
            'transactions': [
                {
                    'id': tx.id,
                    'type': tx.get_display_type(),
                    'icon': tx.get_icon(),
                    'amount': f"{'+' if tx.amount > 0 else ''}{tx.amount} STA",
                    'value': f"{'+' if tx.amount > 0 else '-'}${abs(tx.amount * 0.10):.2f}",
                    'date': tx.get_time_ago(),
                    'category': tx.get_category(),
                    'status': tx.status,
                    'transaction_hash': tx.transaction_hash
                } for tx in transactions
            ]
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})