# matrix_ceo/management/commands/seed_matrix_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from matrix_ceo.models import Project, PlayerParticipation, MatrixSession
from django.utils import timezone
from decimal import Decimal
import random

class Command(BaseCommand):
    help = 'Seed initial demo data for Matrix CEO Game'

    def handle(self, *args, **options):
        self.stdout.write('Seeding Matrix CEO demo data...')
        
        # Create demo user if not exists
        demo_user, created = User.objects.get_or_create(
            username='demo_player',
            defaults={
                'email': 'demo@nextstar.com',
                'first_name': 'Demo',
                'last_name': 'Player'
            }
        )
        if created:
            demo_user.set_password('demopassword123')
            demo_user.save()
            self.stdout.write(self.style.SUCCESS('Created demo user'))

        # Create sample projects
        projects_data = [
            {
                'name': 'Quantum AI Assistant',
                'domain': 'AI',
                'description': 'Build next-generation AI assistant with quantum computing capabilities. Revolutionize how humans interact with machines through advanced natural language processing and predictive analytics.',
                'icon': '🤖',
                'total_shares': 1000,
                'ceo_shares': 200,
                'participant_shares': 800,
                'ticket_price': Decimal('25.00'),
                'matrix_complexity': 7,
                'time_limit_hours': 24,
                'required_patterns': 3,
                'status': 'active'
            },
            {
                'name': 'Blockchain Supply Chain',
                'domain': 'Blockchain',
                'description': 'Revolutionize supply chain management with transparent blockchain tracking. Create immutable records for product provenance from source to consumer.',
                'icon': '⛓️',
                'total_shares': 800,
                'ceo_shares': 150,
                'participant_shares': 650,
                'ticket_price': Decimal('15.00'),
                'matrix_complexity': 6,
                'time_limit_hours': 18,
                'required_patterns': 3,
                'status': 'running'
            },
            {
                'name': 'Gene Therapy Platform',
                'domain': 'Biotech',
                'description': 'Develop innovative gene therapies for rare genetic disorders. Leverage CRISPR technology to create personalized treatment solutions.',
                'icon': '🧬',
                'total_shares': 1200,
                'ceo_shares': 300,
                'participant_shares': 900,
                'ticket_price': Decimal('50.00'),
                'matrix_complexity': 8,
                'time_limit_hours': 36,
                'required_patterns': 4,
                'status': 'active'
            },
            {
                'name': 'FinTech Payment Gateway',
                'domain': 'Fintech',
                'description': 'Create next-generation payment processing with instant settlements and low fees. Target emerging markets with mobile-first solutions.',
                'icon': '💳',
                'total_shares': 900,
                'ceo_shares': 180,
                'participant_shares': 720,
                'ticket_price': Decimal('20.00'),
                'matrix_complexity': 5,
                'time_limit_hours': 20,
                'required_patterns': 3,
                'status': 'active'
            },
            {
                'name': 'Solar Energy Grid',
                'domain': 'CleanTech',
                'description': 'Develop smart solar energy grid with AI-powered distribution and battery storage optimization for urban environments.',
                'icon': '☀️',
                'total_shares': 1500,
                'ceo_shares': 250,
                'participant_shares': 1250,
                'ticket_price': Decimal('30.00'),
                'matrix_complexity': 7,
                'time_limit_hours': 30,
                'required_patterns': 4,
                'status': 'running'
            }
        ]

        created_projects = []
        for project_data in projects_data:
            project, created = Project.objects.get_or_create(
                name=project_data['name'],
                defaults=project_data
            )
            if created:
                created_projects.append(project)
                self.stdout.write(self.style.SUCCESS(f'Created project: {project.name}'))

        # Create participations for demo user
        running_projects = Project.objects.filter(status='running')
        for project in running_projects[:2]:  # Demo user participates in 2 running projects
            participation, created = PlayerParticipation.objects.get_or_create(
                player=demo_user,
                project=project,
                defaults={
                    'tickets_purchased': 1,
                    'investment_amount': project.ticket_price,
                    'transaction_hash': f'tx_demo_{project.id}_{demo_user.id}',
                    'nft_token_id': f'nft_demo_{project.id}_{demo_user.id}'
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created participation: {demo_user.username} in {project.name}'))

                # Create matrix session for the participation
                matrix_session = MatrixSession.objects.create(
                    participation=participation,
                    matrix_data=project.generate_matrix_data(),
                    current_layer=random.randint(0, 2),
                    patterns_found=random.randint(0, project.required_patterns - 1),
                    moves_made=random.randint(5, 20),
                    time_elapsed=random.randint(10, 60)
                )
                self.stdout.write(self.style.SUCCESS(f'Created matrix session for {project.name}'))

        # Create some completed projects with CEO
        completed_project_data = {
            'name': 'Neural Interface Startup',
            'domain': 'AI',
            'description': 'Develop brain-computer interfaces for medical rehabilitation and human augmentation.',
            'icon': '🧠',
            'total_shares': 1000,
            'ceo_shares': 200,
            'participant_shares': 800,
            'ticket_price': Decimal('40.00'),
            'matrix_complexity': 9,
            'time_limit_hours': 48,
            'required_patterns': 4,
            'status': 'completed'
        }

        completed_project, created = Project.objects.get_or_create(
            name=completed_project_data['name'],
            defaults=completed_project_data
        )

        if created:
            # Create CEO participation
            ceo_participation = PlayerParticipation.objects.create(
                player=demo_user,
                project=completed_project,
                tickets_purchased=1,
                investment_amount=completed_project.ticket_price,
                completed_game=True,
                completion_time=120,  # 2 hours
                shares_earned=45,
                transaction_hash=f'tx_ceo_{completed_project.id}_{demo_user.id}',
                nft_token_id=f'nft_ceo_{completed_project.id}_{demo_user.id}'
            )

            # Set CEO
            completed_project.ceo_player = ceo_participation
            completed_project.start_time = timezone.now() - timezone.timedelta(hours=50)
            completed_project.end_time = timezone.now() - timezone.timedelta(hours=2)
            completed_project.save()

            # Create completed matrix session
            MatrixSession.objects.create(
                participation=ceo_participation,
                matrix_data=completed_project.generate_matrix_data(),
                status='completed',
                current_layer=3,  # All layers completed
                patterns_found=4,
                moves_made=25,
                time_elapsed=120,
                completed_at=timezone.now() - timezone.timedelta(hours=2)
            )

            self.stdout.write(self.style.SUCCESS(f'Created completed project with CEO: {completed_project.name}'))

        # Create additional demo users and participations
        additional_users = [
            {'username': 'ai_enthusiast', 'email': 'ai@nextstar.com', 'first_name': 'AI', 'last_name': 'Enthusiast'},
            {'username': 'blockchain_expert', 'email': 'blockchain@nextstar.com', 'first_name': 'Blockchain', 'last_name': 'Expert'},
            {'username': 'biotech_researcher', 'email': 'biotech@nextstar.com', 'first_name': 'BioTech', 'last_name': 'Researcher'},
        ]

        for user_data in additional_users:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults=user_data
            )
            if created:
                user.set_password('demopassword123')
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Created additional user: {user.username}'))

                # Add participations for additional users
                available_projects = Project.objects.filter(status__in=['active', 'running'])
                for project in available_projects[:2]:
                    participation, created = PlayerParticipation.objects.get_or_create(
                        player=user,
                        project=project,
                        defaults={
                            'tickets_purchased': random.randint(1, 3),
                            'investment_amount': project.ticket_price * random.randint(1, 3),
                            'transaction_hash': f'tx_{user.username}_{project.id}',
                            'nft_token_id': f'nft_{user.username}_{project.id}'
                        }
                    )
                    if created:
                        # Create matrix session for running projects
                        if project.status == 'running':
                            MatrixSession.objects.create(
                                participation=participation,
                                matrix_data=project.generate_matrix_data(),
                                current_layer=random.randint(0, 2),
                                patterns_found=random.randint(0, project.required_patterns - 1),
                                moves_made=random.randint(5, 30),
                                time_elapsed=random.randint(15, 90)
                            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded Matrix CEO demo data!'))
        self.print_summary()

    def print_summary(self):
        """Print summary of created data"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write('MATRIX CEO DEMO DATA SUMMARY')
        self.stdout.write('='*50)
        
        projects = Project.objects.all()
        for project in projects:
            participations = project.participations.count()
            self.stdout.write(f"\n📊 {project.name} ({project.domain})")
            self.stdout.write(f"   Status: {project.status}")
            self.stdout.write(f"   Participants: {participations}")
            self.stdout.write(f"   Available Tickets: {project.available_tickets}")
            self.stdout.write(f"   CEO Shares: {project.ceo_shares}")
            
            if project.ceo_player:
                self.stdout.write(f"   👑 CEO: {project.ceo_player.player.username}")

        total_participations = PlayerParticipation.objects.count()
        total_sessions = MatrixSession.objects.count()
        
        self.stdout.write(f"\n📈 TOTAL STATS:")
        self.stdout.write(f"   Projects: {projects.count()}")
        self.stdout.write(f"   Participations: {total_participations}")
        self.stdout.write(f"   Matrix Sessions: {total_sessions}")
        self.stdout.write(f"   Demo Users: {User.objects.count()}")