from django.contrib import admin

from gameEngine.models import PlayerProfile
from  .models import CommunityProposal
admin.site.register(PlayerProfile)
admin.site.register(CommunityProposal)