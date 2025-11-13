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
from .models import PlayerProfile, Venture, PlayerVenture, Activity, PlayerBadge, Badge, VentureParticipation, NFTBadge, MazeSession, HederaTransaction
from web3.models import UserWallet
from hiero_sdk_python import (
    AccountId,
)
import logging
from hiero.utils import create_new_account
from hiero.ft import associate_token
import random
logger = logging.getLogger(__name__)

def assign_user_wallet(name):
    """Optimized wallet assignment with better error handling"""
    try:
        recipient_id, recipient_private_key, new_account_public_key = create_new_account(name)
        associate_token(recipient_id, recipient_private_key)
        
        return {
            'status': 'success',
            'new_account_public_key': new_account_public_key,
            'recipient_private_key': recipient_private_key,
            'recipient_id': recipient_id
        }
    except Exception as e:
        logger.error(f"Wallet assignment error: {e}")
        return {'status': 'failed', 'error': str(e)}
# API Views
# Template rendering views
def landing_page(request):
    """Render the landing page"""
    return render(request, 'landing.html')

def login_page(request):
    """Render the login page"""
    # If user is already authenticated, redirect to game
    if request.user.is_authenticated:
        return redirect('gaming')
    return render(request, 'registration/login.html')

def register_page(request):
    """Render the register page"""
    # If user is already authenticated, redirect to game
    if request.user.is_authenticated:
        return redirect('gaming')
    return render(request, 'registration/register.html')

@login_required(login_url='login')
def gaming_page(request):
    """Render the main game page"""
    return render(request, 'index.html')

# API Views for authentication
@csrf_exempt
@require_http_methods(["POST"])
def api_register(request):
    """Handle user registration via API"""
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        password2 = data.get('password2', '')

        # Validation
        if not username or not email or not password:
            return JsonResponse({
                'success': False,
                'error': 'All fields are required'
            }, status=400)

        if len(username) < 3:
            return JsonResponse({
                'success': False,
                'error': 'Username must be at least 3 characters long'
            }, status=400)

        if len(password) < 8:
            return JsonResponse({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=400)

        if password != password2:
            return JsonResponse({
                'success': False,
                'error': 'Passwords do not match'
            }, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({
                'success': False,
                'error': 'Username already exists'
            }, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False,
                'error': 'Email already exists'
            }, status=400)
        try:
            # Create wallet first (more expensive operation)
            wallet_response = assign_user_wallet(name=f"{username}")
            
            if wallet_response['status'] != 'success':
                return JsonResponse({
                'success': False,
                'error': 'Wallet Creation Failed!'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'{e}'
            }, status=400)
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        wallet = UserWallet.objects.create(
            user=user,
            public_key=wallet_response['new_account_public_key'],
            private_key=wallet_response['recipient_private_key'],
            recipient_id=wallet_response['recipient_id']
        )

        # PlayerProfile is automatically created via signal
        player_profile = PlayerProfile.objects.get(user=user)

        # Log the user in
        login(request, user)

        return JsonResponse({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            },
            'profile': {
                'tickets': player_profile.tickets,
                'total_equity': player_profile.total_equity,
                'xp': player_profile.xp,
                'level': player_profile.level
            },
            'message': 'Account created successfully!'
        })

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Registration failed: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def api_login(request):
    """Handle user login via API"""
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return JsonResponse({
                'success': False,
                'error': 'Username and password are required'
            }, status=400)

        # Authenticate user
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            player_profile = PlayerProfile.objects.get(user=user)

            return JsonResponse({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                },
                'profile': {
                    'tickets': player_profile.tickets,
                    'total_equity': player_profile.total_equity,
                    'xp': player_profile.xp,
                    'level': player_profile.level
                },
                'message': 'Login successful!'
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Invalid username or password'
            }, status=401)

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Login failed: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def api_logout(request):
    """Handle user logout via API"""
    try:
        logout(request)
        return JsonResponse({
            'success': True,
            'message': 'Logged out successfully'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Logout failed: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def api_check_auth(request):
    """Check if user is authenticated and return user data"""
    try:
        if request.user.is_authenticated:
            player_profile = PlayerProfile.objects.get(user=request.user)
            return JsonResponse({
                'authenticated': True,
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email
                },
                'profile': {
                    'tickets': player_profile.tickets,
                    'total_equity': player_profile.total_equity,
                    'xp': player_profile.xp,
                    'level': player_profile.level,
                    'created_at': player_profile.created_at.isoformat()
                }
            })
        else:
            return JsonResponse({
                'authenticated': False
            })
    except PlayerProfile.DoesNotExist:
        # If profile doesn't exist, create one
        if request.user.is_authenticated:
            player_profile = PlayerProfile.objects.create(user=request.user)
            return JsonResponse({
                'authenticated': True,
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email
                },
                'profile': {
                    'tickets': player_profile.tickets,
                    'total_equity': player_profile.total_equity,
                    'xp': player_profile.xp,
                    'level': player_profile.level,
                    'created_at': player_profile.created_at.isoformat()
                }
            })
    except Exception as e:
        return JsonResponse({
            'authenticated': False,
            'error': str(e)
        }, status=500)

# Traditional form-based views (optional - for non-JS fallback)
@require_http_methods(["GET", "POST"])
def traditional_register(request):
    """Traditional form-based registration (optional)"""
    if request.user.is_authenticated:
        return redirect('gaming')
    
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        password2 = request.POST.get('password2', '')

        # Validation
        errors = []
        if not username or not email or not password:
            errors.append('All fields are required')
        
        if len(username) < 3:
            errors.append('Username must be at least 3 characters long')
        
        if len(password) < 8:
            errors.append('Password must be at least 8 characters long')
        
        if password != password2:
            errors.append('Passwords do not match')
        
        if User.objects.filter(username=username).exists():
            errors.append('Username already exists')
        
        if User.objects.filter(email=email).exists():
            errors.append('Email already exists')
        
        try:
            # Create wallet first (more expensive operation)
            wallet_response = assign_user_wallet(name=f"{username}")
            
            if wallet_response['status'] != 'success':
                errors.append('Wallet Creation Failed')
        except Exception as e:
            errors.append(f'{e}')

        if not errors:
            try:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password
                )
                UserWallet.objects.create(
                    user=user,
                    public_key=wallet_response['new_account_public_key'],
                    private_key=wallet_response['recipient_private_key'],
                    recipient_id=wallet_response['recipient_id']
                )
                login(request, user)
                return redirect('gaming')
            except Exception as e:
                errors.append(f'Registration failed: {str(e)}')
        
        # If there are errors, render form with errors
        return render(request, 'register.html', {'errors': errors})
    
    # GET request - show empty form
    return render(request, 'register.html')

@require_http_methods(["GET", "POST"])
def traditional_login(request):
    """Traditional form-based login (optional)"""
    if request.user.is_authenticated:
        return redirect('gaming')
    
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        if not username or not password:
            return render(request, 'login.html', {'error': 'Username and password are required'})

        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('gaming')
        else:
            return render(request, 'login.html', {'error': 'Invalid username or password'})
    
    # GET request - show empty form
    return render(request, 'login.html')

def traditional_logout(request):
    """Traditional logout"""
    logout(request)
    return redirect('landing')


@csrf_exempt
@require_http_methods(["GET"])
def api_profile(request):
    """Get player profile data"""
    if not request.user.is_authenticated:
        return JsonResponse({
            'error': 'Authentication required'
        }, status=401)
    
    try:
        player_profile = PlayerProfile.objects.get(user=request.user)
        
        # Get player ventures with venture details
        player_ventures = PlayerVenture.objects.filter(player=player_profile).select_related('venture')
        ventures_data = []
        for pv in player_ventures:
            ventures_data.append({
                'id': pv.id,
                'venture': {
                    'id': pv.venture.id,
                    'name': pv.venture.name,
                    'icon': pv.venture.icon,
                    'venture_type': pv.venture.venture_type
                },
                'equity_share': float(pv.equity_share),
                'current_value': float(pv.current_value),
                'joined_at': pv.joined_at.isoformat()
            })
        
        # Get player badges - FIXED: using player_badges related name
        player_badges = PlayerBadge.objects.filter(player=player_profile).select_related('badge')
        badges_data = []
        for pb in player_badges:
            badges_data.append({
                'badge': {
                    'id': pb.badge.id,
                    'name': pb.badge.name,
                    'icon': pb.badge.icon,
                    'description': pb.badge.description,
                    'rarity': pb.badge.rarity
                },
                'unlocked_at': pb.unlocked_at.isoformat()
            })
        
        # Get recent activities
        activities = Activity.objects.filter(player=player_profile).order_by('-created_at')[:10]
        activities_data = []
        for activity in activities:
            activities_data.append({
                'icon': activity.icon,
                'description': activity.description,
                'created_at': activity.created_at.isoformat(),
                'activity_type': activity.activity_type
            })
        
        return JsonResponse({
            'tickets': player_profile.tickets,
            'total_equity': float(player_profile.total_equity),
            'xp': player_profile.xp,
            'level': player_profile.level,
            'stars': player_profile.stars,
            'coins': player_profile.coins,
            'ventures': ventures_data,
            'badges': badges_data,
            'activities': activities_data,
            'created_at': player_profile.created_at.isoformat(),
            'user_id': request.user.id,
            'username': request.user.username,
            'email': request.user.email
        })
        
    except PlayerProfile.DoesNotExist:
        return JsonResponse({
            'error': 'Player profile not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to load profile: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def api_ventures(request):
    """Get all available ventures"""
    try:
        ventures = Venture.objects.filter(status='active')
        
        ventures_data = []
        for venture in ventures:
            ventures_data.append({
                'id': venture.id,
                'name': venture.name,
                'venture_type': venture.venture_type,
                'icon': venture.icon,
                'description': venture.description,
                'max_players': venture.max_participants,
                'current_players': venture.current_participants,
                'difficulty': venture.difficulty,
                'winner_equity': float(venture.ceo_equity),
                'community_equity': float(venture.participant_equity),
                'base_equity': float(venture.total_equity),
                'is_active': venture.status == 'active',
                'is_featured': venture.is_featured,
                'min_level_required': venture.min_level_required,
                'ticket_cost': venture.entry_ticket_cost,
                'duration_days': venture.duration_days,
                'available_slots': venture.available_slots,
                'is_joinable': venture.is_joinable,
                'created_at': venture.created_at.isoformat(),
                'maze_complexity': venture.maze_complexity,
                'maze_time_limit': venture.maze_time_limit,
                'required_patterns': venture.required_patterns
            })
        
        return JsonResponse(ventures_data, safe=False)
        
    except Exception as e:
        import traceback
        print(f"Error in api_ventures: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'error': f'Failed to load ventures: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def api_join_venture(request, venture_id):
    """Join a venture"""
    try:
        # Get the venture - use status filter instead of is_active
        venture = get_object_or_404(Venture, id=venture_id, status='active')
        
        # Get player profile
        player_profile = get_object_or_404(PlayerProfile, user=request.user)
        
        # Check if player already joined
        if VentureParticipation.objects.filter(player=player_profile, venture=venture).exists():
            return JsonResponse({
                'success': False,
                'error': f'You have already joined {venture.name}'
            }, status=400)
        
        # Check if venture is full
        if venture.current_participants >= venture.max_participants:
            return JsonResponse({
                'success': False,
                'error': f'{venture.name} is full'
            }, status=400)
        
        # Check if player has enough tickets
        if player_profile.tickets < venture.entry_ticket_cost:
            return JsonResponse({
                'success': False,
                'error': f'Not enough tickets. Required: {venture.entry_ticket_cost}, You have: {player_profile.tickets}'
            }, status=400)
        
        # Check level requirement
        if player_profile.level < venture.min_level_required:
            return JsonResponse({
                'success': False,
                'error': f'Level {venture.min_level_required} required to join this venture (Current: {player_profile.level})'
            }, status=400)
        
        # Check if venture is joinable (using the property from your model)
        if not venture.is_joinable:
            return JsonResponse({
                'success': False,
                'error': f'{venture.name} is not currently accepting new participants'
            }, status=400)
        
        # All checks passed - process the join
        
        # 1. Deduct tickets from player
        player_profile.tickets -= venture.entry_ticket_cost
        
        # 2. Add XP for joining venture
        player_profile.add_xp(10)
        
        # 3. Update venture participation stats
        player_profile.total_ventures_joined += 1
        player_profile.save()
        
        # 4. Create venture participation record
        participation = VentureParticipation.objects.create(
            player=player_profile,
            venture=venture,
            entry_tickets_used=venture.entry_ticket_cost,
            equity_earned=0.0  # Will be calculated when venture completes
        )
        
        # 5. Create activity
        Activity.objects.create(
            player=player_profile,
            activity_type='venture_join',
            icon='⚔️',
            description=f'Joined venture: {venture.name}',
            venture=venture
        )
        
        # 6. Calculate equity share for this player
        # Each participant gets equal share of participant_equity
        equity_share = venture.participant_equity / venture.max_participants
        
        # 7. Create PlayerVenture relationship for equity tracking
        from .models import PlayerVenture
        player_venture = PlayerVenture.objects.create(
            player=player_profile,
            venture=venture,
            equity_share=equity_share,
            initial_investment=venture.entry_ticket_cost * 100,  # Convert to currency value
            current_value=venture.entry_ticket_cost * 100  # Initial value same as investment
        )
        
        # 8. Submit HCS message (if HCS is configured)
        try:
            from hiero.hcs import submit_venture_update
            submit_venture_update(
                venture_name=venture.name,
                topic_id=venture.hcs_topic_id,
                update_type="player_joined",
                data={
                    "player_id": player_profile.id,
                    "player_username": player_profile.user.username,
                    "equity_earned": equity_share,
                    "tickets_spent": venture.entry_ticket_cost,
                    "current_participants": venture.current_participants + 1,
                    "available_slots": venture.available_slots - 1
                }
            )
        except Exception as hcs_error:
            print(f"HCS message failed: {hcs_error}")
            # Continue even if HCS fails
        
        # 9. Check if venture should start automatically
        venture.check_and_start()
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully joined {venture.name}!',
            'equity_share': equity_share,
            'tickets_remaining': player_profile.tickets,
            'xp_gained': 10,
            'venture': {
                'id': venture.id,
                'name': venture.name,
                'current_participants': venture.current_participants + 1,
                'available_slots': venture.available_slots - 1
            }
        })
        
    except Venture.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Venture not found or not active'
        }, status=404)
    except PlayerProfile.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Player profile not found'
        }, status=404)
    except Exception as e:
        import traceback
        print(f"Error joining venture: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'error': f'Failed to join venture: {str(e)}'
        }, status=500)
@csrf_exempt
@require_http_methods(["POST"])
def api_buy_tickets(request):
    """Purchase tickets"""
    if not request.user.is_authenticated:
        return JsonResponse({
            'error': 'Authentication required'
        }, status=401)
    
    try:
        data = json.loads(request.body)
        count = data.get('count', 1)
        
        if count <= 0:
            return JsonResponse({
                'error': 'Invalid ticket count'
            }, status=400)
        
        # Maximum purchase limit
        if count > 100:
            return JsonResponse({
                'error': 'Cannot purchase more than 100 tickets at once'
            }, status=400)
        
        player_profile = PlayerProfile.objects.get(user=request.user)
        
        with transaction.atomic():
            # Calculate cost (example pricing)
            star_cost = calculate_ticket_cost(count)
            
            # Check if player has enough stars
            if player_profile.stars < star_cost:
                return JsonResponse({
                    'error': f'Not enough stars. Required: {star_cost}, Available: {player_profile.stars}'
                }, status=400)
            
            # Deduct stars and add tickets
            player_profile.stars -= star_cost
            player_profile.tickets += count
            player_profile.save()
            
            # Create activity
            Activity.objects.create(
                player=player_profile,
                activity_type='purchase',
                icon='🎫',
                description=f'Purchased {count} Star Tickets for {star_cost} stars',
                metadata={
                    'tickets_purchased': count,
                    'stars_spent': star_cost,
                    'unit_price': star_cost / count
                }
            )
            
            return JsonResponse({
                'success': True,
                'message': f'Purchased {count} tickets for {star_cost} stars',
                'total_tickets': player_profile.tickets,
                'remaining_stars': player_profile.stars,
                'tickets_purchased': count,
                'stars_spent': star_cost
            })
            
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data'
        }, status=400)
    except PlayerProfile.DoesNotExist:
        return JsonResponse({
            'error': 'Player profile not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to purchase tickets: {str(e)}'
        }, status=500)

# Utility Functions

def calculate_ticket_cost(count):
    """Calculate star cost for tickets (bulk discounts)"""
    base_price = 20  # stars per ticket
    
    if count >= 50:
        return count * (base_price * 0.7)  # 30% discount
    elif count >= 20:
        return count * (base_price * 0.8)  # 20% discount
    elif count >= 10:
        return count * (base_price * 0.9)  # 10% discount
    else:
        return count * base_price

def check_venture_badges(player_profile):
    """Check and unlock venture-related badges"""
    try:
        ventures_joined = PlayerVenture.objects.filter(player=player_profile).count()
        
        # Venture Hunter badge - join 5 ventures
        if ventures_joined >= 5:
            badge, created = Badge.objects.get_or_create(
                name='Venture Hunter',
                defaults={
                    'icon': '⚔️',
                    'description': 'Join 5 different ventures',
                    'requirement_type': 'ventures_joined',
                    'requirement_value': 5,
                    'reward_xp': 100,
                    'reward_tickets': 5,
                    'rarity': 'rare'
                }
            )
            
            # Check if player already has this badge
            player_badge, badge_created = PlayerBadge.objects.get_or_create(
                player=player_profile,
                badge=badge
            )
            
            if badge_created:
                # Add reward XP and tickets
                player_profile.xp += badge.reward_xp
                player_profile.tickets += badge.reward_tickets
                player_profile.save()
                
                # Create badge unlock activity
                Activity.objects.create(
                    player=player_profile,
                    activity_type='badge_earned',
                    icon='🏆',
                    description=f'Unlocked badge: {badge.name}',
                    metadata={
                        'badge_id': badge.id,
                        'badge_name': badge.name,
                        'reward_xp': badge.reward_xp,
                        'reward_tickets': badge.reward_tickets
                    }
                )
        
        # Equity Master badge - reach 25% total equity
        if player_profile.total_equity >= 25:
            badge, created = Badge.objects.get_or_create(
                name='Equity Master',
                defaults={
                    'icon': '📈',
                    'description': 'Reach 25% total equity',
                    'requirement_type': 'equity_threshold',
                    'requirement_value': 25,
                    'reward_xp': 200,
                    'reward_tickets': 10,
                    'rarity': 'epic'
                }
            )
            
            # Check if player already has this badge
            player_badge, badge_created = PlayerBadge.objects.get_or_create(
                player=player_profile,
                badge=badge
            )
            
            if badge_created:
                # Add reward XP and tickets
                player_profile.xp += badge.reward_xp
                player_profile.tickets += badge.reward_tickets
                player_profile.save()
                
                # Create badge unlock activity
                Activity.objects.create(
                    player=player_profile,
                    activity_type='badge_earned',
                    icon='🏆',
                    description=f'Unlocked badge: {badge.name}',
                    metadata={
                        'badge_id': badge.id,
                        'badge_name': badge.name,
                        'reward_xp': badge.reward_xp,
                        'reward_tickets': badge.reward_tickets
                    }
                )
                
    except Exception as e:
        print(f"Error checking badges: {e}")
# Venture Game Views - Add these to your existing views.py

@login_required
def get_active_venture_games(request):
    """Get active venture games for the CEO competition"""
    try:
        player = request.user.playerprofile
        active_ventures = Venture.objects.filter(
            status__in=['active', 'running']
        ).order_by('-created_at')
        
        ventures_data = []
        for venture in active_ventures:
            has_joined = venture.participants.filter(player=player).exists()
            
            venture_data = {
                'id': venture.id,
                'name': venture.name,
                'venture_type': venture.venture_type,
                'icon': venture.icon,
                'description': venture.description,
                'status': venture.status,
                'entry_ticket_cost': venture.entry_ticket_cost,
                'current_participants': venture.current_participants,
                'max_participants': venture.max_participants,
                'maze_complexity': venture.maze_complexity,
                'ceo_equity': venture.ceo_equity,
                'participant_equity': venture.participant_equity,
                'time_limit': venture.maze_time_limit,
                'required_patterns': venture.required_patterns,
                'hcs_topic_id': venture.hcs_topic_id,
                'is_joinable': venture.is_joinable,
                'hasJoined': has_joined,
            }
            ventures_data.append(venture_data)
        
        return JsonResponse({
            'success': True,
            'ventures': ventures_data
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def api_join_venture(request, venture_id):
    """Join a venture"""
    try:
        # Get the venture - use status filter instead of is_active
        venture = get_object_or_404(Venture, id=venture_id, status='active')
        
        # Get player profile
        player_profile = get_object_or_404(PlayerProfile, user=request.user)
        
        # Check if player already joined
        if VentureParticipation.objects.filter(player=player_profile, venture=venture).exists():
            return JsonResponse({
                'success': False,
                'error': f'You have already joined {venture.name}'
            }, status=400)
        
        # Check if venture is full
        if venture.current_participants >= venture.max_participants:
            return JsonResponse({
                'success': False,
                'error': f'{venture.name} is full'
            }, status=400)
        
        # Check if player has enough tickets
        if player_profile.tickets < venture.entry_ticket_cost:
            return JsonResponse({
                'success': False,
                'error': f'Not enough tickets. Required: {venture.entry_ticket_cost}, You have: {player_profile.tickets}'
            }, status=400)
        
        # Check level requirement
        if player_profile.level < venture.min_level_required:
            return JsonResponse({
                'success': False,
                'error': f'Level {venture.min_level_required} required to join this venture (Current: {player_profile.level})'
            }, status=400)
        
        # Check if venture is joinable (using the property from your model)
        if not venture.is_joinable:
            return JsonResponse({
                'success': False,
                'error': f'{venture.name} is not currently accepting new participants'
            }, status=400)
        
        # All checks passed - process the join
        
        # 1. Deduct tickets from player
        player_profile.tickets -= venture.entry_ticket_cost
        
        # 2. Add XP for joining venture
        player_profile.add_xp(10)
        
        # 3. Update venture participation stats
        player_profile.total_ventures_joined += 1
        player_profile.save()
        
        # 4. Create venture participation record
        participation = VentureParticipation.objects.create(
            player=player_profile,
            venture=venture,
            entry_tickets_used=venture.entry_ticket_cost,
            equity_earned=0.0  # Will be calculated when venture completes
        )
        
        # 5. Create PlayerVenture relationship for equity tracking
        from .models import PlayerVenture
        equity_share = venture.participant_equity / venture.max_participants
        player_venture = PlayerVenture.objects.create(
            player=player_profile,
            venture=venture,
            equity_share=equity_share,
            initial_investment=venture.entry_ticket_cost * 100,
            current_value=venture.entry_ticket_cost * 100
        )
        
        # 6. Create activity
        Activity.objects.create(
            player=player_profile,
            activity_type='venture_join',
            icon='⚔️',
            description=f'Joined venture: {venture.name}',
            venture=venture
        )
        
        # 7. Submit HCS message
        try:
            from hiero.hcs import submit_venture_update
            submit_venture_update(
                venture_name=venture.name,
                topic_id=venture.hcs_topic_id,
                update_type="player_joined",
                data={
                    "player_id": player_profile.id,
                    "player_username": player_profile.user.username,
                    "equity_earned": equity_share,
                    "tickets_spent": venture.entry_ticket_cost,
                    "current_participants": venture.current_participants,
                    "available_slots": venture.available_slots
                }
            )
        except Exception as hcs_error:
            print(f"HCS message failed: {hcs_error}")
        
        # 8. ✅ REMOVED: Don't auto-start the venture
        # venture.check_and_start()  # COMMENT THIS LINE OUT
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully joined {venture.name}!',
            'equity_share': equity_share,
            'tickets_remaining': player_profile.tickets,
            'xp_gained': 10,
            'venture': {
                'id': venture.id,
                'name': venture.name,
                'current_participants': venture.current_participants,
                'available_slots': venture.available_slots,
                'status': venture.status  # ✅ Return status to frontend
            }
        })
        
    except Venture.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Venture not found or not active'
        }, status=404)
    except Exception as e:
        import traceback
        print(f"Error joining venture: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'error': f'Failed to join venture: {str(e)}'
        }, status=500)

@login_required
def get_venture_maze(request, venture_id):
    """Get or create maze session for a venture game"""
    try:
        venture = get_object_or_404(Venture, id=venture_id)
        player = request.user.playerprofile
        
        if venture.status != 'running':
            return JsonResponse({
                'success': False, 
                'error': 'Venture maze is not currently running'
            })
        
        # Check if player has joined
        if not venture.participants.filter(player=player).exists():
            return JsonResponse({
                'success': False,
                'error': 'You must join the venture before entering the maze'
            })
        
        # Get existing active session or create new one
        session, created = MazeSession.objects.get_or_create(
            player=player,
            venture=venture,
            status='active',
            defaults={
                'maze_configuration': venture.generate_maze_configuration(),
                'current_position': {'x': 0, 'y': 0},
                'discovered_patterns': []
            }
        )
        
        # Update player's current maze session
        player.current_maze_session = session
        player.save()
        
        maze_data = {
            'sessionId': str(session.id),
            'ventureId': venture.id,
            'complexity': venture.maze_complexity,
            'timeLimit': venture.maze_time_limit,
            'timeRemaining': session.time_remaining,
            'currentPosition': session.current_position,
            'movesMade': session.moves_made,
            'patternsFound': session.patterns_found,
            'patternsRequired': venture.required_patterns,
            'mazeLayout': session.maze_configuration.get('layout', {}),
            'discoveredPatterns': session.discovered_patterns,
            'status': session.status
        }
        
        return JsonResponse({
            'success': True, 
            'maze': maze_data
        })
        
    except Exception as e:
        print(f"Error creating maze session: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def make_maze_move(request, session_id):
    """Process a move in the maze"""
    try:
        session = get_object_or_404(
            MazeSession, 
            id=session_id, 
            player=request.user.playerprofile
        )
        
        if session.status != 'active':
            return JsonResponse({
                'success': False, 
                'error': 'Maze session is not active'
            })
        
        data = json.loads(request.body)
        direction = data.get('direction')
        
        if direction not in ['up', 'down', 'left', 'right']:
            return JsonResponse({
                'success': False, 
                'error': 'Invalid direction'
            })
        
        # Update session time
        session.time_elapsed = min(
            session.time_elapsed + 1, 
            session.maze_configuration.get('time_limit', 3600)
        )
        
        # Process move (simplified - in production, implement proper maze logic)
        session.moves_made += 1
        
        # Update position based on direction
        current_x = session.current_position.get('x', 0)
        current_y = session.current_position.get('y', 0)
        
        if direction == 'up':
            session.current_position = {'x': current_x, 'y': current_y - 1}
        elif direction == 'down':
            session.current_position = {'x': current_x, 'y': current_y + 1}
        elif direction == 'left':
            session.current_position = {'x': current_x - 1, 'y': current_y}
        elif direction == 'right':
            session.current_position = {'x': current_x + 1, 'y': current_y}
        
        # Check for pattern discovery (simplified)
        maze_layout = session.maze_configuration.get('layout', {})
        if random.random() > 0.8:  # 20% chance to find pattern
            session.patterns_found = min(
                session.patterns_found + 1, 
                session.maze_configuration.get('required_patterns', 5)
            )
            session.discovered_patterns.append({
                'pattern_id': len(session.discovered_patterns) + 1,
                'type': f'pattern_{random.randint(1, 5)}',
                'discovered_at': timezone.now().isoformat()
            })
        
        # Check if maze completed (simplified - reach end position)
        end_pos = maze_layout.get('end', {'x': 9, 'y': 9})
        patterns_required = session.maze_configuration.get('required_patterns', 5)
        
        if (session.current_position == end_pos and 
            session.patterns_found >= patterns_required):
            session.complete_session(success=True)
            
            # Check if this player is the first to complete
            existing_winners = MazeSession.objects.filter(
                venture=session.venture,
                status='completed',
                completed_at__lt=session.completed_at
            ).exists()
            
            if not existing_winners:
                # This player is the first to complete - they become CEO!
                session.venture.complete_venture(session.player)
        
        session.save()
        
        return JsonResponse({
            'success': True,
            'newPosition': session.current_position,
            'movesMade': session.moves_made,
            'patternsFound': session.patterns_found,
            'timeRemaining': session.time_remaining,
            'completed': session.status == 'completed'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
def venture_game_leaderboard(request, venture_id):
    """Get leaderboard for a venture game"""
    try:
        venture = get_object_or_404(Venture, id=venture_id)
        player = request.user.playerprofile
        
        # Get completed sessions ordered by completion time
        completed_sessions = MazeSession.objects.filter(
            venture=venture,
            status='completed'
        ).select_related('player').order_by('completed_at')[:10]
        
        leaderboard = []
        for session in completed_sessions:
            is_ceo = (session.player.is_ceo and 
                     session.player.ceo_of_venture == venture)
            
            leaderboard.append({
                'player': session.player.user.username,
                'completionTime': session.time_elapsed,
                'movesMade': session.moves_made,
                'patternsFound': session.patterns_found,
                'isCEO': is_ceo
            })
        
        # Add current player if they're active but not completed
        current_session = MazeSession.objects.filter(
            venture=venture,
            player=player,
            status='active'
        ).first()
        
        if current_session and not any(entry['player'] == player.user.username 
                                     for entry in leaderboard):
            leaderboard.append({
                'player': player.user.username + ' (You)',
                'completionTime': 'In Progress',
                'movesMade': current_session.moves_made,
                'patternsFound': current_session.patterns_found,
                'isCEO': False
            })
        
        return JsonResponse({
            'success': True,
            'leaderboard': leaderboard
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

# Utility function to start venture games (can be called via admin or cron)
def start_venture_game(venture_id):
    """Start a venture game (maze competition)"""
    try:
        venture = Venture.objects.get(id=venture_id)
        
        if venture.status == 'active' and venture.current_participants > 0:
            venture.status = 'running'
            venture.start_time = timezone.now()
            venture.end_time = venture.start_time + timezone.timedelta(
                seconds=venture.maze_time_limit
            )
            venture.save()
            
            # Create HCS message for game start
            HederaTransaction.objects.create(
                transaction_id=f"game_start_{venture.id}_{int(timezone.now().timestamp())}",
                transaction_type='system',
                venture=venture,
                from_account='0.0.0',
                to_account='0.0.0',
                status='completed',
                memo=f"Venture game started: {venture.name}"
            )
            
            return True
        return False
        
    except Venture.DoesNotExist:
        return False
    

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def api_start_venture(request, venture_id):
    """Manually start a venture (for testing)"""
    try:
        venture = get_object_or_404(Venture, id=venture_id)
        
        # Only allow starting if venture is active and has participants
        if venture.status != 'active':
            return JsonResponse({
                'success': False,
                'error': f'Venture is not active (current status: {venture.status})'
            }, status=400)
        
        if venture.current_participants == 0:
            return JsonResponse({
                'success': False,
                'error': 'No participants in this venture'
            }, status=400)
        
        # Start the venture
        if venture.start_venture():
            return JsonResponse({
                'success': True,
                'message': f'Started {venture.name}! Maze sessions created for all participants.',
                'venture_status': venture.status
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Failed to start venture'
            }, status=400)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Failed to start venture: {str(e)}'
        }, status=500)