from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

@csrf_exempt
@require_http_methods(["GET", "POST"])
def logout_view(request):
    """Handle user logout with both traditional and API support"""
    if request.method == 'POST':
        # API logout
        try:
            logout(request)
            return JsonResponse({
                'success': True,
                'message': 'Logged out successfully',
                'redirect_url': '/'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Logout failed: {str(e)}'
            }, status=500)
    else:
        # Traditional logout
        logout(request)
        return redirect('landing')

@login_required
def api_logout(request):
    """API endpoint for logout"""
    try:
        logout(request)
        return JsonResponse({
            'success': True,
            'message': 'Logged out successfully',
            'redirect_url': '/'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Logout failed: {str(e)}'
        }, status=500)