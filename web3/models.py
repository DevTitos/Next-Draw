from django.db import models
import uuid
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from cryptography.fernet import Fernet
import os
from cryptography.fernet import Fernet
import base64
from dotenv import load_dotenv
import json
from django.utils import timezone
from decimal import Decimal
load_dotenv()
from gameEngine.models import PlayerProfile

class UserWallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    fiat_balance = models.DecimalField(max_digits=9, decimal_places=2, default=0)
    public_key = models.CharField(max_length=256, blank=True, null=True)
    private_key = models.CharField(max_length=256, blank=True, null=True, editable=False)
    recipient_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """Encrypt private keys before saving."""
        if self.private_key:
            key_str = str(self.private_key)
            if not key_str.startswith("gAAAA"):  # Avoid double encryption
                self.private_key = self.encrypt_key(key_str)
        super().save(*args, **kwargs)

    def encrypt_key(self, key: str) -> str:
        """
        Encrypt the private key using Fernet.
        """
        try:
            secret_key = os.getenv('SECRET_KEY')
            if not secret_key:
                raise ValueError("Missing SECRET_KEY in environment variables")
            
            key_bytes = secret_key.encode()
            key_base64 = base64.urlsafe_b64encode(key_bytes.ljust(32)[:32])
            f = Fernet(key_base64)
            return f.encrypt(key.encode()).decode()
        except Exception as e:
            raise ValueError(f"Encryption error: {e}")

    def decrypt_key(self) -> str:
        """
        Decrypt the private key using Fernet.
        """
        try:
            secret_key = os.getenv('SECRET_KEY')
            if not secret_key:
                raise ValueError("Missing SECRET_KEY in environment variables")
            
            key_bytes = secret_key.encode()
            key_base64 = base64.urlsafe_b64encode(key_bytes.ljust(32)[:32])
            f = Fernet(key_base64)
            return f.decrypt(self.private_key.encode()).decode()
        except Exception as e:
            raise ValueError(f"Decryption error: {e}")

    def __str__(self):
        return f"{self.user.username} Wallet"
    

# Add to your existing models.py
class CommunityProposal(models.Model):
    PROPOSAL_TYPES = [
        ('feature', 'New Feature'),
        ('venture', 'New Venture'),
        ('governance', 'Governance Change'),
        ('funding', 'Funding Allocation'),
        ('partnership', 'Partnership'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active Voting'),
        ('passed', 'Passed'),
        ('rejected', 'Rejected'),
        ('implemented', 'Implemented'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    proposal_type = models.CharField(max_length=20, choices=PROPOSAL_TYPES)
    created_by = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='proposals_created')
    created_at = models.DateTimeField(auto_now_add=True)
    voting_start = models.DateTimeField(null=True, blank=True)
    voting_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    required_approval = models.FloatField(default=51.0)  # Percentage required to pass
    total_votes = models.IntegerField(default=0)
    yes_votes = models.IntegerField(default=0)
    no_votes = models.IntegerField(default=0)
    abstain_votes = models.IntegerField(default=0)
    
    # Implementation details
    implementation_notes = models.TextField(blank=True, null=True)
    implemented_at = models.DateTimeField(null=True, blank=True)
    implemented_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'community_proposals'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
    
    @property
    def approval_rate(self):
        if self.total_votes == 0:
            return 0
        return (self.yes_votes / self.total_votes) * 100
    
    @property
    def is_active(self):
        return self.status == 'active'
    
    @property
    def days_remaining(self):
        if not self.voting_end:
            return 0
        from django.utils import timezone
        remaining = self.voting_end - timezone.now()
        return max(0, remaining.days)

class ProposalVote(models.Model):
    VOTE_CHOICES = [
        ('yes', 'Yes'),
        ('no', 'No'),
        ('abstain', 'Abstain'),
    ]
    
    proposal = models.ForeignKey(CommunityProposal, on_delete=models.CASCADE, related_name='votes')
    voter = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='votes_cast')
    vote = models.CharField(max_length=10, choices=VOTE_CHOICES)
    voted_at = models.DateTimeField(auto_now_add=True)
    voting_power = models.FloatField(default=1.0)  # Based on player's equity/level
    
    class Meta:
        db_table = 'proposal_votes'
        unique_together = ['proposal', 'voter']
    
    def __str__(self):
        return f"{self.voter.user.username} voted {self.vote} on {self.proposal.title}"

class CommunityEvent(models.Model):
    EVENT_TYPES = [
        ('town_hall', 'Town Hall'),
        ('proposal_review', 'Proposal Review'),
        ('governance_update', 'Governance Update'),
        ('community_vote', 'Community Vote'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    scheduled_for = models.DateTimeField()
    duration_minutes = models.IntegerField(default=60)
    host = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='hosted_events')
    max_participants = models.IntegerField(default=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'community_events'
        ordering = ['scheduled_for']
    
    def __str__(self):
        return f"{self.title} - {self.scheduled_for}"

class EventParticipant(models.Model):
    event = models.ForeignKey(CommunityEvent, on_delete=models.CASCADE, related_name='participants')
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='events_attended')
    joined_at = models.DateTimeField(auto_now_add=True)
    contribution_xp = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'event_participants'
        unique_together = ['event', 'player']
    
    def __str__(self):
        return f"{self.player.user.username} at {self.event.title}"

class GovernanceBadge(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10)
    description = models.TextField()
    requirement_type = models.CharField(max_length=50)  # 'proposals_created', 'votes_cast', etc.
    requirement_value = models.IntegerField()
    reward_xp = models.IntegerField(default=100)
    reward_tickets = models.IntegerField(default=5)
    reward_stars = models.IntegerField(default=25)
    
    class Meta:
        db_table = 'governance_badges'
    
    def __str__(self):
        return self.name

class PlayerGovernanceStats(models.Model):
    player = models.OneToOneField(PlayerProfile, on_delete=models.CASCADE, related_name='gov_stats')
    proposals_created = models.IntegerField(default=0)
    votes_cast = models.IntegerField(default=0)
    events_attended = models.IntegerField(default=0)
    successful_proposals = models.IntegerField(default=0)
    total_voting_power = models.FloatField(default=0.0)
    governance_level = models.IntegerField(default=1)
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'player_governance_stats'
    
    def __str__(self):
        return f"{self.player.user.username} Governance Stats"
    
    @property
    def participation_rate(self):
        total_opportunities = self.proposals_created + self.votes_cast + self.events_attended
        if total_opportunities == 0:
            return 0
        return (self.votes_cast + self.events_attended) / total_opportunities * 100