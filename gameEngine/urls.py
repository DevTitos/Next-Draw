from django.urls import path
from . import views

urlpatterns = [
    # Template rendering URLs
    path('', views.landing_page, name='landing'),
    path('login/', views.login_page, name='login_page'),
    path('register/', views.register_page, name='register_page'),
    path('gaming/', views.gaming_page, name='gaming'),
    
    # API endpoints (used by the JavaScript forms)
    path('api/auth/register/', views.api_register, name='api_register'),
    path('api/auth/login/', views.api_login, name='api_login'),
    path('api/auth/logout/', views.api_logout, name='api_logout'),
    path('api/auth/check/', views.api_check_auth, name='api_check_auth'),
    
    # Traditional form-based URLs (optional - for non-JS fallback)
    path('auth/register/', views.traditional_register, name='traditional_register'),
    path('auth/login/', views.traditional_login, name='traditional_login'),
    path('auth/logout/', views.traditional_logout, name='traditional_logout'),

    # API endpoints
    path('api/profile/', views.api_profile, name='api_profile'),
    path('api/ventures/', views.api_ventures, name='api_ventures'),
    path('api/ventures/<int:venture_id>/join/', views.api_join_venture, name='api_join_venture'),
    path('api/profile/buy_tickets/', views.api_buy_tickets, name='api_buy_tickets'),

    # Ventures API Endpoint
    path('api/game/ventures/active/', views.get_active_venture_games, name='active_venture_games'),
    path('api/game/ventures/<int:venture_id>/join/', views.join_venture_game, name='join_venture_game'),
    path('api/game/ventures/<int:venture_id>/maze/', views.get_venture_maze, name='get_venture_maze'),
    path('api/game/maze/<uuid:session_id>/move/', views.make_maze_move, name='make_maze_move'),
    path('api/game/ventures/<int:venture_id>/leaderboard/', views.venture_game_leaderboard, name='venture_game_leaderboard'),
]