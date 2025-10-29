from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

class PlayerProfile(models.Model):
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='playerprofile'
    )
    
    # Core game stats
    tickets = models.IntegerField(default=5)
    total_equity = models.FloatField(default=0.0)
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    
    # Player progression
    total_ventures_joined = models.IntegerField(default=0)
    total_ventures_won = models.IntegerField(default=0)
    total_equity_earned = models.FloatField(default=0.0)
    
    # Currency and resources
    stars = models.IntegerField(default=100)  # Premium currency - start with 100
    coins = models.IntegerField(default=1000)  # Regular currency
    
    # Player preferences
    avatar = models.CharField(max_length=10, default='🚀')
    theme = models.CharField(
        max_length=20,
        choices=[
            ('dark', 'Dark Theme'),
            ('light', 'Light Theme'),
            ('nebula', 'Nebula Theme'),
        ],
        default='dark'
    )
    
    # Social features
    bio = models.TextField(max_length=500, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    twitter_handle = models.CharField(max_length=50, blank=True, null=True)
    
    # Game settings
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    newsletter_subscribed = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_active = models.DateTimeField(auto_now=True)
    
    # Achievement tracking
    streak_days = models.IntegerField(default=0)
    last_login_streak = models.DateField(null=True, blank=True)
    
    class Meta:
        db_table = 'player_profiles'
        verbose_name = 'Player Profile'
        verbose_name_plural = 'Player Profiles'
        ordering = ['-total_equity', '-level']
    
    def __str__(self):
        return f"{self.user.username}'s Profile (Level {self.level})"
    
    @property
    def xp_required_for_next_level(self):
        """Calculate XP required for next level"""
        return 100 * (self.level ** 2)
    
    @property
    def xp_progress_percentage(self):
        """Calculate progress to next level as percentage"""
        xp_required = self.xp_required_for_next_level
        if xp_required == 0:
            return 0
        return (self.xp / xp_required) * 100
    
    @property
    def net_worth(self):
        """Calculate player's total net worth"""
        base_net_worth = self.coins + (self.stars * 100)
        return base_net_worth
    
    def add_xp(self, amount):
        """Add XP and check for level up"""
        self.xp += amount
        while self.xp >= self.xp_required_for_next_level:
            self.xp -= self.xp_required_for_next_level
            self.level_up()
        self.save()
    
    def level_up(self):
        """Handle level up logic"""
        self.level += 1
        # Reward player for leveling up
        self.tickets += 2
        self.coins += 500
        self.stars += 5
        
        # Create level up activity
        Activity.objects.create(
            player=self,
            icon='🎯',
            description=f'Reached Level {self.level}!'
        )

class Venture(models.Model):
    DIFFICULTY_CHOICES = [
        ('Easy', 'Easy'),
        ('Medium', 'Medium'),
        ('Hard', 'Hard'),
        ('Expert', 'Expert'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('upcoming', 'Upcoming'),
        ('cancelled', 'Cancelled'),
    ]
    
    name = models.CharField(max_length=100)
    venture_type = models.CharField(max_length=50)
    icon = models.CharField(max_length=10)
    description = models.TextField()
    
    # Game mechanics
    max_players = models.IntegerField(default=50)
    current_players = models.IntegerField(default=0)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    base_equity = models.FloatField(default=100.0)
    winner_equity = models.FloatField(default=20.0)
    community_equity = models.FloatField(default=80.0)
    
    # Timing
    duration_days = models.IntegerField(default=30)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    
    # Status and visibility
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Requirements
    min_level_required = models.IntegerField(default=1)
    ticket_cost = models.IntegerField(default=1)
    
    # Metrics
    total_investment = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ventures'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.venture_type})"
    
    @property
    def available_slots(self):
        return self.max_players - self.current_players
    
    @property
    def is_joinable(self):
        return (self.is_active and 
                self.status == 'active' and 
                self.available_slots > 0)
    
    def calculate_equity_share(self):
        """Calculate equity share for new participants"""
        if self.current_players >= self.max_players:
            return 0.0
        # More players = smaller individual shares
        base_share = (self.community_equity / self.max_players)
        # Adjust for venture difficulty
        difficulty_multiplier = {
            'Easy': 0.8,
            'Medium': 1.0,
            'Hard': 1.2,
            'Expert': 1.5
        }
        return base_share * difficulty_multiplier.get(self.difficulty, 1.0)

class PlayerVenture(models.Model):
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='player_ventures')
    venture = models.ForeignKey(Venture, on_delete=models.CASCADE, related_name='participants')
    
    # Investment details
    equity_share = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )
    initial_investment = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    current_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Performance
    is_winner = models.BooleanField(default=False)
    rank = models.IntegerField(null=True, blank=True)
    performance_score = models.FloatField(default=0.0)
    
    # Timestamps
    joined_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'player_ventures'
        unique_together = ['player', 'venture']
        ordering = ['-joined_at']
    
    def __str__(self):
        return f"{self.player.user.username} - {self.venture.name}"

class Badge(models.Model):
    BADGE_TYPES = [
        ('achievement', 'Achievement'),
        ('milestone', 'Milestone'),
        ('special', 'Special'),
        ('seasonal', 'Seasonal'),
    ]
    
    name = models.CharField(max_length=50)
    icon = models.CharField(max_length=10)
    description = models.TextField()
    badge_type = models.CharField(max_length=20, choices=BADGE_TYPES, default='achievement')
    
    # Requirements
    requirement_type = models.CharField(max_length=50)
    requirement_value = models.IntegerField()
    
    # Rewards
    reward_xp = models.IntegerField(default=0)
    reward_tickets = models.IntegerField(default=0)
    reward_coins = models.IntegerField(default=0)
    reward_stars = models.IntegerField(default=0)
    
    # Visibility
    is_secret = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Rarity
    rarity = models.CharField(
        max_length=20,
        choices=[
            ('common', 'Common'),
            ('rare', 'Rare'),
            ('epic', 'Epic'),
            ('legendary', 'Legendary'),
        ],
        default='common'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'badges'
        ordering = ['rarity', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_rarity_display()})"

class PlayerBadge(models.Model):
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='player_badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='player_badges')
    unlocked_at = models.DateTimeField(auto_now_add=True)
    is_equipped = models.BooleanField(default=False)

    class Meta:
        db_table = 'player_badges'
        unique_together = ['player', 'badge']
        ordering = ['-unlocked_at']
    
    def __str__(self):
        return f"{self.player.user.username} - {self.badge.name}"

class Activity(models.Model):
    ACTIVITY_TYPES = [
        ('venture_join', 'Venture Joined'),
        ('venture_complete', 'Venture Completed'),
        ('level_up', 'Level Up'),
        ('badge_earned', 'Badge Earned'),
        ('purchase', 'Purchase'),
        ('social', 'Social'),
        ('system', 'System'),
    ]
    
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES, default='system')
    icon = models.CharField(max_length=10)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['player', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.player.user.username} - {self.description}"

# Signals
@receiver(post_save, sender=User)
def create_player_profile(sender, instance, created, **kwargs):
    """Automatically create player profile when user is created"""
    if created:
        player_profile = PlayerProfile.objects.create(user=instance)
        
        # Create welcome activity
        Activity.objects.create(
            player=player_profile,
            activity_type='system',
            icon='🎉',
            description='Welcome to Next Star! Start your venture journey.'
        )
        
        # Create default badges
        create_default_badges()

def create_default_badges():
    """Create default badges if they don't exist"""
    default_badges = [
        {
            'name': 'Venture Hunter',
            'icon': '⚔️',
            'description': 'Join 5 different ventures',
            'requirement_type': 'ventures_joined',
            'requirement_value': 5,
            'reward_xp': 100,
            'reward_tickets': 5,
            'rarity': 'rare'
        },
        {
            'name': 'Equity Master',
            'icon': '📈',
            'description': 'Reach 25% total equity',
            'requirement_type': 'equity_threshold',
            'requirement_value': 25,
            'reward_xp': 200,
            'reward_tickets': 10,
            'rarity': 'epic'
        },
        {
            'name': 'Star Collector',
            'icon': '⭐',
            'description': 'Earn 500 stars',
            'requirement_type': 'stars_earned',
            'requirement_value': 500,
            'reward_xp': 150,
            'reward_tickets': 8,
            'rarity': 'rare'
        }
    ]
    
    for badge_data in default_badges:
        Badge.objects.get_or_create(
            name=badge_data['name'],
            defaults=badge_data
        )