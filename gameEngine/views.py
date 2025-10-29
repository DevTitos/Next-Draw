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
from .models import PlayerProfile, Venture, PlayerVenture, Activity, PlayerBadge, Badge
from web3.models import UserWallet
from hiero_sdk_python import (
    AccountId,
)
import logging
from hiero.utils import create_new_account
from hiero.ft import associate_token

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
        ventures = Venture.objects.filter(is_active=True, status='active')
        
        ventures_data = []
        for venture in ventures:
            ventures_data.append({
                'id': venture.id,
                'name': venture.name,
                'venture_type': venture.venture_type,
                'icon': venture.icon,
                'description': venture.description,
                'max_players': venture.max_players,
                'current_players': venture.current_players,
                'difficulty': venture.difficulty,
                'winner_equity': float(venture.winner_equity),
                'community_equity': float(venture.community_equity),
                'base_equity': float(venture.base_equity),
                'is_active': venture.is_active,
                'is_featured': venture.is_featured,
                'min_level_required': venture.min_level_required,
                'ticket_cost': venture.ticket_cost,
                'duration_days': venture.duration_days,
                'available_slots': venture.max_players - venture.current_players,
                'is_joinable': venture.is_joinable,
                'created_at': venture.created_at.isoformat()
            })
        
        return JsonResponse(ventures_data, safe=False)
        
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to load ventures: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def api_join_venture(request, venture_id):
    """Join a venture"""
    if not request.user.is_authenticated:
        return JsonResponse({
            'error': 'Authentication required'
        }, status=401)
    
    try:
        venture = get_object_or_404(Venture, id=venture_id, is_active=True)
        player_profile = PlayerProfile.objects.get(user=request.user)
        
        with transaction.atomic():
            # Check if player has enough tickets
            if player_profile.tickets < venture.ticket_cost:
                return JsonResponse({
                    'error': f'Not enough tickets. Required: {venture.ticket_cost}, Available: {player_profile.tickets}'
                }, status=400)
            
            # Check if player meets level requirement
            if player_profile.level < venture.min_level_required:
                return JsonResponse({
                    'error': f'Level {venture.min_level_required} required to join this venture'
                }, status=400)
            
            # Check if venture has available slots
            if venture.current_players >= venture.max_players:
                return JsonResponse({
                    'error': 'Venture is full'
                }, status=400)
            
            # Check if player already joined this venture
            if PlayerVenture.objects.filter(player=player_profile, venture=venture).exists():
                return JsonResponse({
                    'error': 'Already joined this venture'
                }, status=400)
            
            # Calculate equity share
            equity_share = venture.calculate_equity_share()
            
            # Use tickets
            player_profile.tickets -= venture.ticket_cost
            
            # Create player venture
            player_venture = PlayerVenture.objects.create(
                player=player_profile,
                venture=venture,
                equity_share=equity_share,
                initial_investment=1000.00,
                current_value=1000.00
            )
            
            # Update venture player count
            venture.current_players += 1
            venture.save()
            
            # Update player total equity
            player_profile.total_equity = PlayerVenture.objects.filter(
                player=player_profile
            ).aggregate(total_equity=models.Sum('equity_share'))['total_equity'] or 0.0
            
            # Update ventures joined count
            player_profile.total_ventures_joined += 1
            
            # Add XP
            player_profile.xp += 10
            player_profile.save()
            
            # Create activity
            Activity.objects.create(
                player=player_profile,
                activity_type='venture_join',
                icon='⚔️',
                description=f'Joined venture: {venture.name}',
                metadata={
                    'venture_id': venture.id,
                    'venture_name': venture.name,
                    'equity_earned': equity_share,
                    'tickets_used': venture.ticket_cost
                }
            )
            
            # Check for badge unlocks - FIXED: Pass player_profile
            check_venture_badges(player_profile)
            
            return JsonResponse({
                'success': True,
                'message': f'Successfully joined {venture.name}',
                'equity_share': equity_share,
                'remaining_tickets': player_profile.tickets,
                'venture': {
                    'id': venture.id,
                    'name': venture.name,
                    'icon': venture.icon
                }
            })
            
    except Venture.DoesNotExist:
        return JsonResponse({
            'error': 'Venture not found'
        }, status=404)
    except PlayerProfile.DoesNotExist:
        return JsonResponse({
            'error': 'Player profile not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
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
