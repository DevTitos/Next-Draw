from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from gameEngine.models import Venture, Badge, PlayerProfile, PlayerVenture, Activity
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Create sample data for Next Star game'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')
        
        # Create sample ventures
        self.create_ventures()
        
        # Create sample badges
        self.create_badges()
        
        # Create sample user and profile data
        self.create_sample_users()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully created sample data!')
        )

    def create_ventures(self):
        ventures_data = [
            {
                'name': 'Quantum Farms',
                'venture_type': 'Agriculture',
                'icon': '🌱',
                'description': 'Revolutionize farming with quantum-enhanced soil technology that increases crop yields by 300% while using 90% less water.',
                'max_players': 50,
                'current_players': 24,
                'difficulty': 'Medium',
                'winner_equity': 20.0,
                'community_equity': 80.0,
                'is_featured': True,
                'ticket_cost': 1,
                'min_level_required': 1
            },
            {
                'name': 'Neo Energy Core',
                'venture_type': 'Energy',
                'icon': '⚡',
                'description': 'Develop miniature black hole reactors that provide clean, limitless energy for entire cities from a device the size of a basketball.',
                'max_players': 30,
                'current_players': 18,
                'difficulty': 'Hard',
                'winner_equity': 25.0,
                'community_equity': 75.0,
                'is_featured': True,
                'ticket_cost': 2,
                'min_level_required': 3
            },
            {
                'name': 'Cyber Finance AI',
                'venture_type': 'Finance',
                'icon': '💰',
                'description': 'Build an AI-powered banking platform that predicts market fluctuations with 95% accuracy and automatically optimizes investments.',
                'max_players': 60,
                'current_players': 32,
                'difficulty': 'Medium',
                'winner_equity': 20.0,
                'community_equity': 80.0,
                'is_featured': False,
                'ticket_cost': 1,
                'min_level_required': 2
            },
            {
                'name': 'Neuro Health Tech',
                'venture_type': 'Healthcare',
                'icon': '🏥',
                'description': 'Create brain-computer interfaces that restore mobility to paralysis patients and enhance cognitive abilities through neural stimulation.',
                'max_players': 40,
                'current_players': 15,
                'difficulty': 'Easy',
                'winner_equity': 15.0,
                'community_equity': 85.0,
                'is_featured': False,
                'ticket_cost': 1,
                'min_level_required': 1
            },
            {
                'name': 'Space Logistics Inc',
                'venture_type': 'Transport',
                'icon': '🚀',
                'description': 'Establish orbital delivery services for lunar colonies using reusable rocket technology that reduces space transport costs by 80%.',
                'max_players': 45,
                'current_players': 28,
                'difficulty': 'Hard',
                'winner_equity': 30.0,
                'community_equity': 70.0,
                'is_featured': True,
                'ticket_cost': 3,
                'min_level_required': 5
            },
            {
                'name': 'Aqua Pure Solutions',
                'venture_type': 'Environment',
                'icon': '💧',
                'description': 'Develop nanofiltration technology that can turn any water source into pure drinking water instantly, addressing global water scarcity.',
                'max_players': 35,
                'current_players': 12,
                'difficulty': 'Medium',
                'winner_equity': 22.0,
                'community_equity': 78.0,
                'is_featured': False,
                'ticket_cost': 2,
                'min_level_required': 2
            },
            {
                'name': 'Meta Education Platform',
                'venture_type': 'Education',
                'icon': '🎓',
                'description': 'Build an immersive VR education platform that adapts to individual learning styles, making complex subjects accessible to everyone.',
                'max_players': 55,
                'current_players': 41,
                'difficulty': 'Easy',
                'winner_equity': 18.0,
                'community_equity': 82.0,
                'is_featured': True,
                'ticket_cost': 1,
                'min_level_required': 1
            },
            {
                'name': 'Crypto Security Fortress',
                'venture_type': 'Blockchain',
                'icon': '🔐',
                'description': 'Create quantum-resistant blockchain technology that makes digital assets completely secure against future computational threats.',
                'max_players': 25,
                'current_players': 22,
                'difficulty': 'Expert',
                'winner_equity': 35.0,
                'community_equity': 65.0,
                'is_featured': False,
                'ticket_cost': 4,
                'min_level_required': 8
            }
        ]

        for venture_data in ventures_data:
            venture, created = Venture.objects.get_or_create(
                name=venture_data['name'],
                defaults=venture_data
            )
            if created:
                self.stdout.write(f'Created venture: {venture.name}')

    def create_badges(self):
        badges_data = [
            {
                'name': 'Venture Hunter',
                'icon': '⚔️',
                'description': 'Join 5 different ventures',
                'requirement_type': 'ventures_joined',
                'requirement_value': 5,
                'reward_xp': 100,
                'reward_tickets': 5,
                'reward_coins': 500,
                'reward_stars': 10,
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
                'reward_coins': 1000,
                'reward_stars': 25,
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
                'reward_coins': 750,
                'reward_stars': 50,
                'rarity': 'rare'
            },
            {
                'name': 'Level Up Legend',
                'icon': '🎯',
                'description': 'Reach Level 10',
                'requirement_type': 'level_threshold',
                'requirement_value': 10,
                'reward_xp': 300,
                'reward_tickets': 15,
                'reward_coins': 1500,
                'reward_stars': 75,
                'rarity': 'epic'
            },
            {
                'name': 'First Venture',
                'icon': '🎉',
                'description': 'Join your first venture',
                'requirement_type': 'ventures_joined',
                'requirement_value': 1,
                'reward_xp': 50,
                'reward_tickets': 3,
                'reward_coins': 250,
                'reward_stars': 5,
                'rarity': 'common'
            },
            {
                'name': 'Ticket Tycoon',
                'icon': '🎫',
                'description': 'Own 50 tickets at once',
                'requirement_type': 'tickets_owned',
                'requirement_value': 50,
                'reward_xp': 180,
                'reward_tickets': 20,
                'reward_coins': 1200,
                'reward_stars': 60,
                'rarity': 'rare'
            },
            {
                'name': 'Wealth Builder',
                'icon': '💎',
                'description': 'Accumulate 10,000 coins',
                'requirement_type': 'coins_earned',
                'requirement_value': 10000,
                'reward_xp': 250,
                'reward_tickets': 12,
                'reward_coins': 2000,
                'reward_stars': 100,
                'rarity': 'epic'
            },
            {
                'name': 'Venture Victor',
                'icon': '🏆',
                'description': 'Win your first venture',
                'requirement_type': 'ventures_won',
                'requirement_value': 1,
                'reward_xp': 400,
                'reward_tickets': 25,
                'reward_coins': 3000,
                'reward_stars': 150,
                'rarity': 'legendary'
            }
        ]

        for badge_data in badges_data:
            badge, created = Badge.objects.get_or_create(
                name=badge_data['name'],
                defaults=badge_data
            )
            if created:
                self.stdout.write(f'Created badge: {badge.name}')

    def create_sample_users(self):
        # Create a sample user with some progress
        user, created = User.objects.get_or_create(
            username='demo_player',
            defaults={
                'email': 'demo@nextstar.com',
                'first_name': 'Demo',
                'last_name': 'Player'
            }
        )
        
        if created:
            user.set_password('demopassword123')
            user.save()
            self.stdout.write('Created demo user: demo_player (password: demopassword123)')
            
            # Get the automatically created profile
            profile = user.playerprofile
            
            # Add some sample progress
            profile.tickets = 8
            profile.xp = 150
            profile.level = 3
            profile.stars = 250
            profile.coins = 3500
            profile.save()
            
            # Add some sample ventures
            ventures = Venture.objects.all()[:3]
            for venture in ventures:
                PlayerVenture.objects.create(
                    player=profile,
                    venture=venture,
                    equity_share=venture.calculate_equity_share(),
                    initial_investment=1000.00,
                    current_value=1250.00
                )
            
            # Add some sample activities
            activities = [
                ('🎮', 'Started playing Next Star'),
                ('⚔️', 'Joined venture: Quantum Farms'),
                ('⚔️', 'Joined venture: Cyber Finance AI'),
                ('🎯', 'Reached Level 2'),
                ('💰', 'Earned 500 coins from ventures'),
                ('🎯', 'Reached Level 3')
            ]
            
            for icon, description in activities:
                Activity.objects.create(
                    player=profile,
                    icon=icon,
                    description=description
                )
            
            self.stdout.write('Added sample progress to demo player')