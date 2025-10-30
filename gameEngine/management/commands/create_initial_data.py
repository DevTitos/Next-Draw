import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from gameEngine.models import (
    PlayerProfile, Venture, Badge, PlayerBadge, Activity, 
    VentureParticipation, MazeSession, NFTBadge, HederaTransaction,
    PlayerVenture, create_default_badges, create_demo_venture_game
)

class Command(BaseCommand):
    help = 'Create initial data for the game engine including ventures, badges, and demo players'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing data before creating new data',
        )
        parser.add_argument(
            '--players',
            type=int,
            default=5,
            help='Number of demo players to create',
        )
        parser.add_argument(
            '--ventures',
            type=int,
            default=3,
            help='Number of demo ventures to create',
        )

    def handle(self, *args, **options):
        clear_data = options['clear']
        num_players = options['players']
        num_ventures = options['ventures']
        
        if clear_data:
            self.clear_existing_data()
        
        self.stdout.write(self.style.SUCCESS('🚀 Creating initial game data...'))
        
        # Create default badges
        self.create_default_badges()
        
        # Create demo ventures
        ventures = self.create_demo_ventures(num_ventures)
        
        # Create demo players
        players = self.create_demo_players(num_players)
        
        # Create player activities and badges
        self.create_player_activities_and_badges(players)
        
        # Create venture participations
        self.create_venture_participations(players, ventures)
        
        # Create some completed maze sessions
        self.create_maze_sessions(players, ventures)
        
        # Create NFT badges for achievements
        self.create_nft_badges(players, ventures)
        
        # Create Hedera transactions
        self.create_hedera_transactions(players, ventures)
        
        self.stdout.write(self.style.SUCCESS(
            f'✅ Successfully created initial data:\n'
            f'   - {len(players)} players\n'
            f'   - {len(ventures)} ventures\n'
            f'   - {Badge.objects.count()} badges\n'
            f'   - {Activity.objects.count()} activities\n'
            f'   - {VentureParticipation.objects.count()} venture participations\n'
            f'   - {MazeSession.objects.count()} maze sessions\n'
            f'   - {NFTBadge.objects.count()} NFT badges\n'
            f'   - {HederaTransaction.objects.count()} Hedera transactions'
        ))

    def clear_existing_data(self):
        """Clear all existing data"""
        self.stdout.write(self.style.WARNING('🗑️ Clearing existing data...'))
        
        models_to_clear = [
            HederaTransaction, NFTBadge, MazeSession, VentureParticipation,
            PlayerVenture, PlayerBadge, Activity, PlayerProfile, Venture, Badge
        ]
        
        for model in models_to_clear:
            count = model.objects.count()
            model.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'   Deleted {count} {model.__name__} objects'))
        
        # Delete demo users but keep superusers
        demo_users = User.objects.filter(
            username__startswith='demo_',
            is_superuser=False
        )
        demo_count = demo_users.count()
        demo_users.delete()
        self.stdout.write(self.style.WARNING(f'   Deleted {demo_count} demo users'))

    def create_default_badges(self):
        """Create default badges"""
        self.stdout.write(self.style.SUCCESS('🏆 Creating default badges...'))
        create_default_badges()
        
        # Create additional specialized badges
        additional_badges = [
            {
                'name': 'Maze Master',
                'icon': '🌌',
                'description': 'Complete 10 maze challenges',
                'requirement_type': 'mazes_completed',
                'requirement_value': 10,
                'reward_xp': 300,
                'reward_tickets': 15,
                'rarity': 'epic'
            },
            {
                'name': 'CEO Champion',
                'icon': '👑',
                'description': 'Become CEO of 3 different ventures',
                'requirement_type': 'ceo_wins',
                'requirement_value': 3,
                'reward_xp': 500,
                'reward_tickets': 25,
                'rarity': 'legendary'
            },
            {
                'name': 'Star Investor',
                'icon': '💫',
                'description': 'Accumulate 50% total equity',
                'requirement_type': 'equity_threshold',
                'requirement_value': 50,
                'reward_xp': 400,
                'reward_tickets': 20,
                'rarity': 'epic'
            }
        ]
        
        for badge_data in additional_badges:
            Badge.objects.get_or_create(
                name=badge_data['name'],
                defaults=badge_data
            )

    def create_demo_ventures(self, count):
        """Create demo ventures"""
        self.stdout.write(self.style.SUCCESS('🚀 Creating demo ventures...'))
        
        venture_templates = [
            {
                'name': 'Quantum Farms',
                'venture_type': 'Agriculture',
                'icon': '🌱',
                'description': 'Revolutionize farming with quantum-enhanced crops that grow 10x faster and are resistant to climate change.',
                'maze_complexity': 4,
                'ceo_equity': 15,
                'status': 'active'
            },
            {
                'name': 'Neo Energy Core',
                'venture_type': 'Energy',
                'icon': '⚡',
                'description': 'Develop miniature black hole reactors that provide unlimited clean energy for entire cities.',
                'maze_complexity': 7,
                'ceo_equity': 25,
                'status': 'running'
            },
            {
                'name': 'Cyber Finance AI',
                'venture_type': 'Finance',
                'icon': '💰',
                'description': 'Create AI-powered banking systems that predict market trends with 99.9% accuracy.',
                'maze_complexity': 6,
                'ceo_equity': 20,
                'status': 'active'
            },
            {
                'name': 'Neuro Health Tech',
                'venture_type': 'Healthcare',
                'icon': '🏥',
                'description': 'Pioneer brain-computer interfaces that can cure neurological disorders and enhance cognitive abilities.',
                'maze_complexity': 5,
                'ceo_equity': 18,
                'status': 'upcoming'
            },
            {
                'name': 'Space Logistics Inc',
                'venture_type': 'Transport',
                'icon': '🚀',
                'description': 'Build orbital delivery networks for lunar colonies and space stations across the solar system.',
                'maze_complexity': 8,
                'ceo_equity': 30,
                'status': 'active'
            }
        ]
        
        ventures = []
        for i in range(min(count, len(venture_templates))):
            template = venture_templates[i]
            
            venture = Venture.objects.create(
                name=template['name'],
                venture_type=template['venture_type'],
                icon=template['icon'],
                description=template['description'],
                hcs_topic_id=f"0.0.{1000000 + i}",
                token_id=f"0.0.{2000000 + i}",
                nft_collection_id=f"0.0.{3000000 + i}",
                total_equity=100.0,
                ceo_equity=template['ceo_equity'],
                participant_equity=100 - template['ceo_equity'],
                entry_ticket_cost=random.randint(1, 3),
                max_participants=random.randint(20, 50),
                min_level_required=random.randint(1, 5),
                maze_complexity=template['maze_complexity'],
                maze_time_limit=random.randint(1800, 7200),  # 30min to 2 hours
                required_patterns=random.randint(3, 8),
                status=template['status'],
                start_time=timezone.now() if template['status'] == 'running' else None,
                end_time=timezone.now() + timezone.timedelta(hours=2) if template['status'] == 'running' else None
            )
            ventures.append(venture)
            self.stdout.write(f'   Created venture: {venture.name}')
        
        return ventures

    def create_demo_players(self, count):
        """Create demo players"""
        self.stdout.write(self.style.SUCCESS('👥 Creating demo players...'))

        player_templates = [
            {'username': 'quantum_pioneer', 'avatar': '🚀', 'level': 15, 'tickets': 12, 'stars': 350, 'equity': 45.5},
            {'username': 'star_navigator', 'avatar': '⭐', 'level': 12, 'tickets': 8, 'stars': 280, 'equity': 32.2},
            {'username': 'neo_visionary', 'avatar': '👁️', 'level': 18, 'tickets': 15, 'stars': 520, 'equity': 67.8},
            {'username': 'cyber_trader', 'avatar': '💻', 'level': 10, 'tickets': 6, 'stars': 190, 'equity': 25.6},
            {'username': 'quantum_ceo', 'avatar': '👑', 'level': 25, 'tickets': 20, 'stars': 800, 'equity': 89.3, 'is_ceo': True},
        ]

        players = []
        for i in range(min(count, len(player_templates))):
            template = player_templates[i]

            # Create user
            user, created = User.objects.get_or_create(
                username=f"demo_{template['username']}",
                defaults={
                    'email': f"{template['username']}@nextstar.com",
                    'password': 'demopassword123',
                    'first_name': template['username'].split('_')[0].title(),
                    'last_name': template['username'].split('_')[1].title(),
                }
            )

            if created:
                # Create player profile
                player_profile = PlayerProfile.objects.get(user=user)
                player_profile.avatar = template['avatar']
                player_profile.level = template['level']
                player_profile.tickets = template['tickets']  # FIX: Use 'tickets'
                player_profile.stars = template['stars']      # FIX: Use 'stars'
                player_profile.total_equity = template['equity']
                player_profile.xp = template['level'] * 100
                player_profile.hedera_account_id = f"0.0.{4000000 + i}"
                player_profile.hedera_recipient_id = f"0.0.{5000000 + i}"

                if template.get('is_ceo'):
                    player_profile.is_ceo = True

                player_profile.save()
                players.append(player_profile)
                self.stdout.write(f'   Created player: {user.username} (Level {template["level"]})')

        return players

    def create_player_activities_and_badges(self, players):
        """Create activities and assign badges to players"""
        self.stdout.write(self.style.SUCCESS('📝 Creating player activities and badges...'))
        
        activity_templates = [
            {'icon': '🎮', 'description': 'Joined Next Star gaming platform'},
            {'icon': '⚔️', 'description': 'Completed first venture challenge'},
            {'icon': '📈', 'description': 'Reached 10% total equity milestone'},
            {'icon': '🌌', 'description': 'Discovered hidden pattern in quantum maze'},
            {'icon': '💫', 'description': 'Earned 100 stars in single session'},
        ]
        
        badges = Badge.objects.all()
        
        for player in players:
            # Create activities
            for i, template in enumerate(activity_templates[:random.randint(2, 5)]):
                Activity.objects.create(
                    player=player,
                    activity_type='system',
                    icon=template['icon'],
                    description=template['description'],
                    created_at=timezone.now() - timezone.timedelta(days=random.randint(1, 30))
                )
            
            # Assign random badges
            for badge in random.sample(list(badges), random.randint(1, 3)):
                PlayerBadge.objects.get_or_create(
                    player=player,
                    badge=badge,
                    defaults={
                        'is_equipped': random.choice([True, False])
                    }
                )

    def create_venture_participations(self, players, ventures):
        """Create venture participations"""
        self.stdout.write(self.style.SUCCESS('🤝 Creating venture participations...'))
        
        for venture in ventures:
            # Select random players to participate
            participants = random.sample(players, min(random.randint(3, 8), len(players)))
            
            for player in participants:
                VentureParticipation.objects.get_or_create(
                    player=player,
                    venture=venture,
                    defaults={
                        'entry_tickets_used': venture.entry_ticket_cost,
                        'equity_earned': random.uniform(0.5, 5.0),
                        'completed_maze': random.choice([True, False]),
                        'completion_time': random.randint(300, 1800) if random.choice([True, False]) else None,
                        'rank': random.randint(1, 20) if random.choice([True, False]) else None,
                        'entry_transaction_id': f"entry_{venture.id}_{player.id}",
                        'equity_transaction_id': f"equity_{venture.id}_{player.id}" if random.choice([True, False]) else None,
                    }
                )
                
                # Also create PlayerVenture record for compatibility
                PlayerVenture.objects.get_or_create(
                    player=player,
                    venture=venture,
                    defaults={
                        'equity_share': random.uniform(0.5, 5.0),
                        'initial_investment': random.uniform(100, 5000),
                        'current_value': random.uniform(1000, 15000),
                        'is_winner': random.choice([True, False]),
                        'rank': random.randint(1, 20) if random.choice([True, False]) else None,
                        'performance_score': random.uniform(5.0, 9.5),
                    }
                )

    def create_maze_sessions(self, players, ventures):
        """Create maze sessions"""
        self.stdout.write(self.style.SUCCESS('🌌 Creating maze sessions...'))
        
        running_ventures = [v for v in ventures if v.status == 'running']
        
        for venture in running_ventures:
            # Get participants for this venture
            participants = VentureParticipation.objects.filter(venture=venture)
            
            for participation in participants[:random.randint(2, 5)]:  # Limit to few players per venture
                player = participation.player
                
                # Create maze session
                session = MazeSession.objects.create(
                    player=player,
                    venture=venture,
                    status=random.choice(['active', 'completed', 'failed']),
                    current_position={'x': random.randint(0, 5), 'y': random.randint(0, 5)},
                    moves_made=random.randint(10, 200),
                    patterns_found=random.randint(0, venture.required_patterns),
                    time_elapsed=random.randint(60, venture.maze_time_limit // 2),
                    maze_configuration=venture.generate_maze_configuration(),
                    discovered_patterns=[
                        {'pattern_id': i+1, 'type': f'pattern_{random.randint(1,5)}', 'discovered_at': timezone.now().isoformat()}
                        for i in range(random.randint(0, 3))
                    ],
                    used_hints=random.randint(0, 3),
                    started_at=timezone.now() - timezone.timedelta(minutes=random.randint(5, 60)),
                    completed_at=timezone.now() if random.choice([True, False]) else None
                )
                
                # Set current maze session for player if active
                if session.status == 'active':
                    player.current_maze_session = session
                    player.save()

    def create_nft_badges(self, players, ventures):
        """Create NFT badges for achievements"""
        self.stdout.write(self.style.SUCCESS('🎨 Creating NFT badges...'))
        
        nft_badge_templates = [
            {'name': 'Quantum Pioneer', 'badge_type': 'venture', 'rarity': 'rare'},
            {'name': 'Star Navigator', 'badge_type': 'milestone', 'rarity': 'epic'},
            {'name': 'Maze Master', 'badge_type': 'special', 'rarity': 'legendary'},
            {'name': 'CEO Champion', 'badge_type': 'ceo', 'rarity': 'legendary'},
        ]
        
        for player in players[:3]:  # Only for first 3 players
            for template in nft_badge_templates[:random.randint(1, 2)]:
                venture = random.choice(ventures) if template['badge_type'] == 'ceo' else None
                
                NFTBadge.objects.create(
                    player=player,
                    venture=venture,
                    token_id=f"0.0.{6000000 + NFTBadge.objects.count()}",
                    serial_number=NFTBadge.objects.count() + 1,
                    badge_type=template['badge_type'],
                    name=template['name'],
                    description=f"Awarded to {player.user.username} for exceptional achievements",
                    rarity=template['rarity'],
                    image_url=f"https://example.com/badges/{template['name'].lower().replace(' ', '_')}.png",
                    metadata_url=f"https://example.com/metadata/{template['name'].lower().replace(' ', '_')}.json",
                    mint_transaction_id=f"mint_{player.id}_{template['name'].lower().replace(' ', '_')}",
                    associated_account_id=player.hedera_account_id,
                    minted_at=timezone.now() - timezone.timedelta(days=random.randint(1, 30))
                )

    def create_hedera_transactions(self, players, ventures):
        """Create Hedera transactions"""
        self.stdout.write(self.style.SUCCESS('🔗 Creating Hedera transactions...'))
        
        transaction_types = [
            ('ticket_purchase', 'Star Ticket Purchase'),
            ('venture_entry', 'Venture Entry'),
            ('equity_distribution', 'Equity Distribution'),
            ('nft_mint', 'NFT Minting'),
        ]
        
        for player in players:
            for i in range(random.randint(2, 5)):
                trans_type, trans_name = random.choice(transaction_types)
                venture = random.choice(ventures) if trans_type in ['venture_entry', 'equity_distribution'] else None
                
                HederaTransaction.objects.create(
                    transaction_id=f"tx_{player.id}_{i}_{int(timezone.now().timestamp())}",
                    transaction_type=trans_type,
                    player=player,
                    venture=venture,
                    amount=random.uniform(1, 100) if trans_type == 'ticket_purchase' else None,
                    token_id=venture.token_id if venture else None,
                    from_account=player.hedera_account_id,
                    to_account='0.0.1234567',  # System account
                    status='completed',
                    memo=f"{trans_name} for {player.user.username}",
                    created_at=timezone.now() - timezone.timedelta(days=random.randint(1, 15)),
                    confirmed_at=timezone.now() - timezone.timedelta(days=random.randint(1, 14))
                )