from django.contrib import admin

from gameEngine.models import PlayerProfile, Venture
from  .models import CommunityProposal
admin.site.register(PlayerProfile)
admin.site.register(CommunityProposal)
admin.site.register(Venture)