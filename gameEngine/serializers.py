# serializers.py
from rest_framework import serializers
from gameEngine.models import Venture

class VentureSerializer(serializers.ModelSerializer):
    max_players = serializers.IntegerField(source='max_participants')
    current_players = serializers.IntegerField(source='current_participants')
    winner_equity = serializers.FloatField(source='ceo_equity')
    community_equity = serializers.FloatField(source='participant_equity')
    ticket_cost = serializers.IntegerField(source='entry_ticket_cost')
    is_active = serializers.SerializerMethodField()
    
    class Meta:
        model = Venture
        fields = [
            'id', 'name', 'venture_type', 'icon', 'description',
            'max_players', 'current_players', 'winner_equity', 
            'community_equity', 'ticket_cost', 'is_active'
        ]
    
    def get_is_active(self, obj):
        return obj.status == 'active'