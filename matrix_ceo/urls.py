# matrix_ceo/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.matrix_dashboard, name='matrix_dashboard'),
    path('projects/<int:project_id>/apply/', views.apply_for_ceo, name='apply_for_ceo'),
    path('selections/<int:selection_id>/matrix/', views.get_matrix_state, name='get_matrix_state'),
    path('selections/<int:selection_id>/solve/', views.attempt_puzzle_solution, name='attempt_puzzle_solution'),
    path('selections/<int:selection_id>/insights/', views.strategic_insights, name='strategic_insights'),
    path('leaderboard/', views.matrix_leaderboard, name='matrix_leaderboard'),
    path('selection/<int:selection_id>/purchase-ticket/', views.purchase_ticket, name='purchase_ticket'),
    path('selection/<int:selection_id>/ticket-info/', views.get_ticket_info, name='get_ticket_info'),
    path('my-tickets/', views.get_user_tickets, name='get_user_tickets'),
]