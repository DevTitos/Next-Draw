from django.urls import path
from . import views
urlpatterns = [
    # Community Governance URLs
    path('api/community/proposals/', views.api_community_proposals, name='api_community_proposals'),
    path('api/community/proposals/create/', views.api_create_proposal, name='api_create_proposal'),
    path('api/community/proposals/<int:proposal_id>/vote/', views.api_vote_proposal, name='api_vote_proposal'),
    path('api/community/events/', views.api_community_events, name='api_community_events'),
    path('api/community/events/<int:event_id>/join/', views.api_join_event, name='api_join_event'),
    path('api/community/stats/', views.api_governance_stats, name='api_governance_stats'),
]