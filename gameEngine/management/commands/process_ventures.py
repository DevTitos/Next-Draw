from django.core.management.base import BaseCommand
from django.utils import timezone
from gameEngine.models import Venture

class Command(BaseCommand):
    help = 'Process venture status transitions and auto-start ventures'
    
    def handle(self, *args, **options):
        self.stdout.write('🔄 Processing venture status transitions...')
        
        # Auto-start ventures that are ready
        active_ventures = Venture.objects.filter(status='active')
        started_count = 0
        
        for venture in active_ventures:
            if venture.check_and_start():
                self.stdout.write(f'   🚀 Started: {venture.name}')
                started_count += 1
        
        # Check for completed ventures (time-based)
        running_ventures = Venture.objects.filter(status='running')
        completed_count = 0
        
        for venture in running_ventures:
            if venture.end_time and venture.end_time <= timezone.now():
                # Auto-complete if time expired
                if not venture.winning_player:
                    # No winner found, distribute equity among participants
                    venture.status = 'completed'
                    venture.completion_time = timezone.now()
                    venture.save()
                    
                    # Distribute equity to all participants
                    participant_share = venture.participant_equity / max(1, venture.current_participants)
                    for participation in venture.participants.all():
                        participation.equity_earned = participant_share
                        participation.player.total_equity += participant_share
                        participation.player.save()
                        participation.save()
                
                self.stdout.write(f'   ✅ Completed: {venture.name}')
                completed_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'✅ Processed {started_count} started and {completed_count} completed ventures'
        ))