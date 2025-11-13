from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from gameEngine.models import Venture
from hiero.hcs import create_topic
import os

class Command(BaseCommand):
    help = 'Create real-world startup ventures provided by the board with HCS topics'

    def handle(self, *args, **options):
        self.stdout.write('Creating real-world startup ventures with HCS topics...')
        
        ventures_data = [
            {
                'name': 'AgriProcess AI',
                'venture_type': 'Food Processing',
                'icon': '🏭',
                'description': 'AI-powered food processing startup using computer vision to reduce waste and optimize supply chains for African agricultural products.',
                'total_equity': 100.0,
                'ceo_equity': 30.0,
                'participant_equity': 70.0,
                'entry_ticket_cost': 2,
                'max_participants': 40,
                'min_level_required': 2,
                'maze_complexity': 7,
                'maze_time_limit': 3600,  # 60 minutes
                'required_patterns': 6,
                'status': 'active',
                'start_time': timezone.now() + timedelta(hours=2),
            },
            {
                'name': 'NeuroTech Analytics',
                'venture_type': 'AI Startup',
                'icon': '🤖',
                'description': 'Enterprise AI platform providing predictive analytics for manufacturing optimization and supply chain intelligence across West Africa.',
                'total_equity': 100.0,
                'ceo_equity': 35.0,
                'participant_equity': 65.0,
                'entry_ticket_cost': 3,
                'max_participants': 30,
                'min_level_required': 3,
                'maze_complexity': 8,
                'maze_time_limit': 4200,  # 70 minutes
                'required_patterns': 7,
                'status': 'active',
                'start_time': timezone.now() + timedelta(hours=4),
            },
            {
                'name': 'EcoBuild Manufacturing',
                'venture_type': 'Manufacturing',
                'icon': '🔧',
                'description': 'Sustainable building materials manufacturer creating affordable, eco-friendly construction materials from recycled plastics and local resources.',
                'total_equity': 100.0,
                'ceo_equity': 25.0,
                'participant_equity': 75.0,
                'entry_ticket_cost': 1,
                'max_participants': 50,
                'min_level_required': 1,
                'maze_complexity': 6,
                'maze_time_limit': 3300,  # 55 minutes
                'required_patterns': 5,
                'status': 'active',
                'start_time': timezone.now() + timedelta(hours=1),
            },
            {
                'name': 'MediChain Supply',
                'venture_type': 'Healthcare Tech',
                'icon': '🏥',
                'description': 'Blockchain-based pharmaceutical supply chain startup ensuring authentic drug distribution and reducing counterfeit medications in African markets.',
                'total_equity': 100.0,
                'ceo_equity': 28.0,
                'participant_equity': 72.0,
                'entry_ticket_cost': 2,
                'max_participants': 35,
                'min_level_required': 2,
                'maze_complexity': 7,
                'maze_time_limit': 3900,  # 65 minutes
                'required_patterns': 6,
                'status': 'active',
                'start_time': timezone.now() + timedelta(hours=3),
            }
        ]

        created_count = 0
        for venture_data in ventures_data:
            # Check if venture already exists
            if not Venture.objects.filter(name=venture_data['name']).exists():
                self.stdout.write(f'Creating HCS topic for {venture_data["name"]}...')
                
                try:
                    # Create real HCS topic for this venture
                    memo = f"Star Venture: {venture_data['name']} - {venture_data['venture_type']}"
                    topic_id = create_topic(memo=memo)
                    
                    if topic_id:
                        venture_data['hcs_topic_id'] = str(topic_id)
                        venture = Venture.objects.create(**venture_data)
                        
                        self.stdout.write(
                            self.style.SUCCESS(f'✅ Created venture: {venture.name} with HCS topic {topic_id}')
                        )
                        created_count += 1
                        
                        # Submit initial venture creation message to HCS
                        from hiero.hcs import submit_venture_update
                        submit_venture_update(
                            venture_name=venture.name,
                            topic_id=venture.hcs_topic_id,
                            update_type="venture_launched",
                            data={
                                "venture_type": venture.venture_type,
                                "ceo_equity": venture.ceo_equity,
                                "participant_equity": venture.participant_equity,
                                "max_participants": venture.max_participants,
                                "launched_by": "board",
                                "description": venture.description
                            }
                        )
                        
                    else:
                        self.stdout.write(
                            self.style.ERROR(f'❌ Failed to create HCS topic for {venture_data["name"]}')
                        )
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'❌ Error creating venture {venture_data["name"]}: {str(e)}')
                    )
            else:
                self.stdout.write(
                    self.style.WARNING(f'⚠️ Venture already exists: {venture_data["name"]}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'🎯 Successfully created {created_count} real-world startup ventures!'),
            self.style.SUCCESS('🏦 All ventures provided by the Star Governance Board')
        )