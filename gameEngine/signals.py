# myapp/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import PlayerProfile

@receiver(post_save, sender=User)
def create_player_profile(sender, instance, created, **kwargs):
    """
    Signal to automatically create a PlayerProfile when a new User is created
    """
    if created:
        PlayerProfile.objects.create(user=instance)
        print(f"✅ Created PlayerProfile for user: {instance.username}")

@receiver(post_save, sender=User)
def save_player_profile(sender, instance, **kwargs):
    """
    Signal to save the PlayerProfile when the User is saved
    """
    try:
        instance.playerprofile.save()
    except PlayerProfile.DoesNotExist:
        # If profile doesn't exist, create it
        PlayerProfile.objects.create(user=instance)
        print(f"🔄 Created missing PlayerProfile for user: {instance.username}")