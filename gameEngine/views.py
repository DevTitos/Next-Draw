from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from gameEngine.models import PlayerProfile

# Template rendering views
def landing_page(request):
    """Render the landing page"""
    return render(request, 'landing.html')

def login_page(request):
    """Render the login page"""
    # If user is already authenticated, redirect to game
    if request.user.is_authenticated:
        return redirect('gaming')
    return render(request, 'login.html')

def register_page(request):
    """Render the register page"""
    # If user is already authenticated, redirect to game
    if request.user.is_authenticated:
        return redirect('gaming')
    return render(request, 'register.html')

@login_required
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

        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
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

        if not errors:
            try:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password
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