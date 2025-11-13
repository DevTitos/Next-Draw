from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import uuid
import random
import json

class PlayerProfile(models.Model):
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='playerprofile'
    )
    
    # Hedera Integration
    hedera_account_id = models.CharField(max_length=32, blank=True, null=True)  # 0.0.1234567
    hedera_recipient_id = models.CharField(max_length=32, blank=True, null=True)
    hedera_public_key = models.TextField(blank=True, null=True)
    
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
    stars = models.IntegerField(default=0)  # Premium currency - start with 100
    coins = models.IntegerField(default=1000)  # Regular currency
    
    # CEO Status
    is_ceo = models.BooleanField(default=False)
    ceo_of_venture = models.ForeignKey(
        'Venture', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='current_ceo'
    )
    total_ceo_wins = models.IntegerField(default=0)
    
    # Current maze session
    current_maze_session = models.ForeignKey(
        'MazeSession', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='active_player'
    )
    
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
        ceo_status = " [CEO]" if self.is_ceo else ""
        return f"{self.user.username}'s Profile (Level {self.level}){ceo_status}"
    
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

class Venture(models.Model):
    """HCS-based ventures where players compete to become CEO"""
    
    STATUS_CHOICES = [
        ('active', 'Active - Accepting Entries'),
        ('running', 'Running - Maze Active'),
        ('completed', 'Completed - CEO Selected'),
        ('upcoming', 'Upcoming'),
    ]
    
    # Venture Identity
    name = models.CharField(max_length=100)
    venture_type = models.CharField(max_length=50)
    icon = models.CharField(max_length=10)
    description = models.TextField()
    
    # Hedera Integration
    hcs_topic_id = models.CharField(max_length=32)  # HCS Topic ID for this venture
    nft_collection_id = models.CharField(max_length=32, blank=True, null=True)  # For badges
    
    # Game Economics
    total_equity = models.FloatField(default=100.0)  # 100% total equity
    ceo_equity = models.FloatField(default=20.0)     # 20% for CEO
    participant_equity = models.FloatField(default=80.0)  # 80% distributed among participants
    
    # Entry Requirements
    entry_ticket_cost = models.IntegerField(default=1)  # STAR tokens required
    max_participants = models.IntegerField(default=100)
    min_level_required = models.IntegerField(default=1)
    
    # Maze Configuration
    maze_complexity = models.IntegerField(default=5)  # 1-10 scale
    maze_time_limit = models.IntegerField(default=3600)  # 1 hour in seconds
    required_patterns = models.IntegerField(default=5)   # Patterns to find
    
    # Status and Timing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    # Results
    winning_player = models.ForeignKey(
        PlayerProfile, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='won_ventures'
    )
    completion_time = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ventures'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.venture_type}) - {self.status}"
    
    @property
    def current_participants(self):
        return self.participants.count()
    
    @property
    def available_slots(self):
        return self.max_participants - self.current_participants
    
    @property
    def is_joinable(self):
        return (self.status == 'active' and 
                self.available_slots > 0 and
                (self.start_time is None or self.start_time > timezone.now()))
    
    @property
    def is_running(self):
        return self.status == 'running'
    
    def start_venture(self):
        """Start the venture maze competition"""
        if self.status == 'active' and self.current_participants > 0:
            self.status = 'running'
            self.start_time = timezone.now()
            self.end_time = self.start_time + timezone.timedelta(seconds=self.maze_time_limit)
            self.save()
            
            # Create maze sessions for all participants
            for participant in self.participants.all():
                MazeSession.objects.create(
                    player=participant.player,
                    venture=self,
                    maze_configuration=self.generate_maze_configuration()
                )
    
    def complete_venture(self, winner):
        """Complete venture and assign CEO"""
        self.status = 'completed'
        self.winning_player = winner
        self.completion_time = timezone.now()
        self.save()
        
        # Make winner CEO
        winner.is_ceo = True
        winner.ceo_of_venture = self
        winner.total_ceo_wins += 1
        winner.total_equity += self.ceo_equity
        winner.save()
        
        # Distribute participant equity
        participant_share = self.participant_equity / max(1, self.current_participants)
        for participation in self.participants.all():
            participation.equity_earned = participant_share
            participation.player.total_equity += participant_share
            participation.player.save()
            participation.save()
        
        # Mint NFT Badge for CEO
        NFTBadge.objects.create(
            player=winner,
            venture=self,
            badge_type='ceo',
            name=f"CEO of {self.name}",
            description=f"Awarded for winning the {self.name} venture maze",
            rarity='legendary'
        )
    
    def generate_maze_configuration(self):
        """Generate unique maze configuration for this venture"""
        return {
            'venture_id': self.id,
            'complexity': self.maze_complexity,
            'time_limit': self.maze_time_limit,
            'required_patterns': self.required_patterns,
            'seed': str(uuid.uuid4()),  # Unique seed for this venture's maze
            'layout': self.generate_maze_layout(),
            'patterns': self.generate_pattern_locations()
        }
    
    def generate_maze_layout(self):
        """Generate maze layout based on complexity"""
        size = 10 + (self.maze_complexity * 2)  # 12x12 to 30x30
        return {
            'size': size,
            'start': {'x': 0, 'y': 0},
            'end': {'x': size-1, 'y': size-1},
            'walls': self.generate_walls(size)
        }
    
    def generate_walls(self, size):
        """Generate random walls for the maze"""
        walls = []
        # Simplified wall generation
        for x in range(size):
            for y in range(size):
                if random.random() > 0.7:  # 30% chance of wall
                    walls.append({'x': x, 'y': y})
        return walls
    
    def generate_pattern_locations(self):
        """Generate pattern locations throughout the maze"""
        patterns = []
        for i in range(self.required_patterns):
            patterns.append({
                'id': i + 1,
                'type': f'pattern_{(i % 5) + 1}',
                'location': {
                    'x': random.randint(2, 8),
                    'y': random.randint(2, 8)
                },
                'solution_required': True
            })
        return patterns
    
    @property
    def should_start(self):
        """Check if venture should automatically start"""
        if self.status == 'active' and self.current_participants >= 1:  # Start with at least 1 player
            # Start immediately for demo, or add time-based logic
            return True
        return False
    
    def check_and_start(self):
        """Check conditions and start the venture if ready"""
        if self.should_start:
            self.start_venture()
            return True
        return False
    
    def start_venture(self):
        """Start the venture maze competition"""
        if self.status == 'active' and self.current_participants > 0:
            self.status = 'running'
            self.start_time = timezone.now()
            self.end_time = self.start_time + timezone.timedelta(seconds=self.maze_time_limit)
            self.save()
            
            # Create maze sessions for all participants
            for participant in self.participants.all():
                MazeSession.objects.create(
                    player=participant.player,
                    venture=self,
                    maze_configuration=self.generate_maze_configuration()
                )
            
            # Create activity for all participants
            for participant in self.participants.all():
                Activity.objects.create(
                    player=participant.player,
                    activity_type='venture_join',
                    icon='🎮',
                    description=f'{self.name} maze competition has started!',
                    venture=self
                )
            
            return True
        return False

class VentureParticipation(models.Model):
    """Track player participation in ventures"""
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='venture_participations')
    venture = models.ForeignKey(Venture, on_delete=models.CASCADE, related_name='participants')
    
    # Entry details
    entry_tickets_used = models.IntegerField(default=1)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    # Results
    equity_earned = models.FloatField(default=0.0)
    completed_maze = models.BooleanField(default=False)
    completion_time = models.IntegerField(null=True, blank=True)  # Seconds taken
    rank = models.IntegerField(null=True, blank=True)
    
    # Hedera Transaction IDs
    entry_transaction_id = models.CharField(max_length=100, blank=True, null=True)
    equity_transaction_id = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'venture_participations'
        unique_together = ['player', 'venture']
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.player.user.username} in {self.venture.name}"

class MazeSession(models.Model):
    """Track individual maze attempts for ventures"""
    
    SESSION_STATUS = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('timeout', 'Timed Out'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='maze_sessions')
    venture = models.ForeignKey(Venture, on_delete=models.CASCADE, related_name='maze_sessions')
    
    # Session state
    status = models.CharField(max_length=20, choices=SESSION_STATUS, default='active')
    current_position = models.JSONField(default=dict)  # {x: 0, y: 0}
    moves_made = models.IntegerField(default=0)
    patterns_found = models.IntegerField(default=0)
    time_elapsed = models.IntegerField(default=0)  # in seconds
    
    # Maze configuration (snapshot at start)
    maze_configuration = models.JSONField(default=dict)
    
    # Session data
    discovered_patterns = models.JSONField(default=list)
    used_hints = models.IntegerField(default=0)
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'maze_sessions'
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.player.user.username} - {self.venture.name} ({self.status})"
    
    @property
    def is_active(self):
        return self.status == 'active' and self.time_elapsed < self.maze_configuration.get('time_limit', 3600)
    
    @property
    def time_remaining(self):
        time_limit = self.maze_configuration.get('time_limit', 3600)
        return max(0, time_limit - self.time_elapsed)
    
    def make_move(self, direction):
        """Process player move in the maze"""
        if not self.is_active:
            return False
        
        self.moves_made += 1
        self.time_elapsed = min(
            self.time_elapsed + 1, 
            self.maze_configuration.get('time_limit', 3600)
        )
        
        # Update position based on direction
        current_x = self.current_position.get('x', 0)
        current_y = self.current_position.get('y', 0)
        
        if direction == 'up':
            self.current_position = {'x': current_x, 'y': current_y - 1}
        elif direction == 'down':
            self.current_position = {'x': current_x, 'y': current_y + 1}
        elif direction == 'left':
            self.current_position = {'x': current_x - 1, 'y': current_y}
        elif direction == 'right':
            self.current_position = {'x': current_x + 1, 'y': current_y}
        
        # Check for pattern discovery
        if random.random() > 0.8:  # 20% chance to find pattern
            self.patterns_found = min(
                self.patterns_found + 1, 
                self.maze_configuration.get('required_patterns', 5)
            )
            self.discovered_patterns.append({
                'pattern_id': len(self.discovered_patterns) + 1,
                'type': f'pattern_{random.randint(1, 5)}',
                'discovered_at': timezone.now().isoformat()
            })
        
        if self.check_completion():
            self.complete_session(success=True)
        
        self.save()
        return True
    
    def check_completion(self):
        """Check if player has completed the maze"""
        config = self.maze_configuration
        end_pos = config.get('layout', {}).get('end', {})
        patterns_required = config.get('required_patterns', 5)
        
        return (self.current_position == end_pos and 
                self.patterns_found >= patterns_required)
    
    def complete_session(self, success=True):
        """Complete the maze session"""
        self.status = 'completed' if success else 'failed'
        self.completed_at = timezone.now()
        
        if success:
            # Check if this player is the first to complete
            existing_winners = MazeSession.objects.filter(
                venture=self.venture,
                status='completed',
                completed_at__lt=self.completed_at
            ).exists()
            
            if not existing_winners:
                # This player is the first to complete - they become CEO!
                self.venture.complete_venture(self.player)
            
            # Record completion for participation
            participation = VentureParticipation.objects.get(
                player=self.player, 
                venture=self.venture
            )
            participation.completed_maze = True
            participation.completion_time = self.time_elapsed
            participation.save()
        
        self.save()

class NFTBadge(models.Model):
    """NFT badges awarded for achievements"""
    
    BADGE_TYPES = [
        ('ceo', 'CEO Badge'),
        ('venture', 'Venture Completion'),
        ('milestone', 'Milestone'),
        ('special', 'Special Achievement'),
    ]
    
    RARITY_LEVELS = [
        ('common', 'Common'),
        ('rare', 'Rare'),
        ('epic', 'Epic'),
        ('legendary', 'Legendary'),
    ]
    
    # NFT Identity
    token_id = models.CharField(max_length=32, unique=True)  # HTS NFT Token ID
    serial_number = models.IntegerField()  # NFT serial number
    
    # Ownership
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='nft_badges')
    venture = models.ForeignKey(Venture, on_delete=models.CASCADE, null=True, blank=True)
    
    # Badge Details
    badge_type = models.CharField(max_length=20, choices=BADGE_TYPES)
    name = models.CharField(max_length=100)
    description = models.TextField()
    rarity = models.CharField(max_length=20, choices=RARITY_LEVELS, default='common')
    
    # NFT Metadata
    image_url = models.URLField(blank=True, null=True)
    metadata_url = models.URLField(blank=True, null=True)  # IPFS or other storage
    
    # Hedera Data
    mint_transaction_id = models.CharField(max_length=100)
    associated_account_id = models.CharField(max_length=32)
    
    # Timestamps
    minted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'nft_badges'
        ordering = ['-minted_at', 'rarity']
    
    def __str__(self):
        return f"{self.name} ({self.get_rarity_display()}) - {self.player.user.username}"

class Activity(models.Model):
    """Player activity feed"""
    
    ACTIVITY_TYPES = [
        ('venture_join', 'Venture Joined'),
        ('venture_win', 'Venture Won'),
        ('ceo_appointed', 'CEO Appointed'),
        ('nft_earned', 'NFT Earned'),
        ('level_up', 'Level Up'),
    ]
    
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    icon = models.CharField(max_length=10)
    description = models.TextField()
    
    # Associated entities
    venture = models.ForeignKey(Venture, on_delete=models.CASCADE, null=True, blank=True)
    nft_badge = models.ForeignKey(NFTBadge, on_delete=models.CASCADE, null=True, blank=True)
    
    # Hedera transaction reference
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activities'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.player.user.username} - {self.description}"

class HederaTransaction(models.Model):
    """Track all Hedera transactions"""
    
    TRANSACTION_TYPES = [
        ('ticket_purchase', 'Star Ticket Purchase'),
        ('venture_entry', 'Venture Entry'),
        ('equity_distribution', 'Equity Distribution'),
        ('nft_mint', 'NFT Minting'),
        ('token_transfer', 'Token Transfer'),
    ]
    
    # Transaction Identity
    transaction_id = models.CharField(max_length=100, unique=True)  # Hedera transaction ID
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPES)
    
    # Associated entities
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, null=True, blank=True)
    venture = models.ForeignKey(Venture, on_delete=models.CASCADE, null=True, blank=True)
    nft_badge = models.ForeignKey(NFTBadge, on_delete=models.CASCADE, null=True, blank=True)
    
    # Transaction details
    amount = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    token_id = models.CharField(max_length=32, blank=True, null=True)
    from_account = models.CharField(max_length=32)
    to_account = models.CharField(max_length=32)
    
    # Status
    status = models.CharField(max_length=20, default='completed')  # completed, failed, pending
    memo = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'hedera_transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.transaction_type} - {self.transaction_id}"

class PlayerVenture(models.Model):
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='player_ventures')
    venture = models.ForeignKey(Venture, on_delete=models.CASCADE, related_name='player_venture_relations')
    
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

# Signals
@receiver(post_save, sender=User)
def create_player_profile(sender, instance, created, **kwargs):
    """Automatically create player profile when user is created"""
    if created:
        player_profile = PlayerProfile.objects.create(user=instance)
        
        # Create welcome activity
        Activity.objects.create(
            player=player_profile,
            activity_type='venture_join',
            icon='🎉',
            description='Welcome to Next Star! Your strategic CEO journey begins now.'
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

@receiver(post_save, sender=Venture)
def create_venture_hcs_topic(sender, instance, created, **kwargs):
    """Create HCS topic for new venture"""
    if created:
        # In production, this would call Hedera to create HCS topic
        # For now, generate a placeholder
        if not instance.hcs_topic_id:
            instance.hcs_topic_id = f"0.0.{1000000 + instance.id}"
            instance.save()

@receiver(post_save, sender=NFTBadge)
def mint_hedera_nft(sender, instance, created, **kwargs):
    """Mint NFT on Hedera when badge is created"""
    if created and not instance.token_id:
        # In production, this would call Hedera NFT Service
        # Generate placeholder token ID
        instance.token_id = f"0.0.{2000000 + instance.id}"
        instance.serial_number = instance.id
        instance.save()
        
        # Record transaction
        HederaTransaction.objects.create(
            transaction_id=f"mint_{instance.id}_{uuid.uuid4().hex[:16]}",
            transaction_type='nft_mint',
            player=instance.player,
            nft_badge=instance,
            from_account='0.0.0',  # System account
            to_account=instance.player.hedera_account_id or '0.0.0',
            status='completed',
            memo=f"Minted NFT Badge: {instance.name}"
        )

# Utility functions
def get_hedera_client():
    """Get Hedera client configuration"""
    # This would return configured Hedera client
    # For now, return None - implement based on your Hedera setup
    return None

def distribute_equity_on_hedera(venture, player, equity_amount):
    """Distribute equity tokens on Hedera"""
    try:
        # This would actually call Hedera Token Service
        # For now, create a transaction record
        transaction = HederaTransaction.objects.create(
            transaction_id=f"equity_{venture.id}_{player.id}_{uuid.uuid4().hex[:16]}",
            transaction_type='equity_distribution',
            player=player,
            venture=venture,
            amount=equity_amount,
            token_id=venture.token_id,
            from_account='0.0.0',  # Venture treasury
            to_account=player.hedera_account_id or '0.0.0',
            status='completed',
            memo=f"Equity distribution from {venture.name}"
        )
        return transaction
    except Exception as e:
        print(f"Error distributing equity: {e}")
        return None

# Admin function to create demo venture games
def create_demo_venture_game():
    """Create a demo venture game for testing"""
    try:
        venture = Venture.objects.create(
            name='Quantum CEO Challenge',
            venture_type='Technology',
            icon='🌌',
            description='First player to escape the quantum maze becomes CEO with 20% equity',
            status='active',
            entry_ticket_cost=1,
            max_participants=10,
            maze_complexity=5,
            ceo_equity=20,
            participant_equity=80,
            maze_time_limit=1800,  # 30 minutes
            required_patterns=3,
            hcs_topic_id=f"0.0.{1000000 + Venture.objects.count()}",
            token_id=f"0.0.{2000000 + Venture.objects.count()}"
        )
        return venture
    except Exception as e:
        print(f"Error creating demo venture: {e}")
        return None