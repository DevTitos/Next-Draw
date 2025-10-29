from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import PlayerProfile, Venture, PlayerVenture, Badge, PlayerBadge, Activity

class PlayerProfileInline(admin.StackedInline):
    model = PlayerProfile
    can_delete = False
    verbose_name_plural = 'Player Profile'

class CustomUserAdmin(UserAdmin):
    inlines = (PlayerProfileInline,)

class VentureAdmin(admin.ModelAdmin):
    list_display = ['name', 'venture_type', 'difficulty', 'current_players', 'max_players', 'is_active', 'is_featured']
    list_filter = ['venture_type', 'difficulty', 'is_active', 'is_featured', 'status']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'venture_type', 'icon', 'description')
        }),
        ('Game Mechanics', {
            'fields': ('max_players', 'current_players', 'difficulty', 'base_equity', 'winner_equity', 'community_equity')
        }),
        ('Requirements', {
            'fields': ('min_level_required', 'ticket_cost')
        }),
        ('Status', {
            'fields': ('status', 'is_active', 'is_featured')
        }),
        ('Timing', {
            'fields': ('duration_days', 'start_date', 'end_date')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        })
    )

class PlayerProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'xp', 'tickets', 'stars', 'total_equity', 'created_at']
    list_filter = ['level', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'last_active']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

class PlayerVentureAdmin(admin.ModelAdmin):
    list_display = ['player', 'venture', 'equity_share', 'current_value', 'joined_at']
    list_filter = ['venture', 'joined_at']
    search_fields = ['player__user__username', 'venture__name']
    readonly_fields = ['joined_at']

class BadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'rarity', 'requirement_type', 'requirement_value', 'is_active']
    list_filter = ['rarity', 'badge_type', 'is_active']
    search_fields = ['name', 'description']

class PlayerBadgeAdmin(admin.ModelAdmin):
    list_display = ['player', 'badge', 'unlocked_at', 'is_equipped']
    list_filter = ['unlocked_at', 'badge__rarity']
    search_fields = ['player__user__username', 'badge__name']

class ActivityAdmin(admin.ModelAdmin):
    list_display = ['player', 'icon', 'description', 'activity_type', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['player__user__username', 'description']
    readonly_fields = ['created_at']

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

# Register your models
admin.site.register(PlayerProfile, PlayerProfileAdmin)
admin.site.register(Venture, VentureAdmin)
admin.site.register(PlayerVenture, PlayerVentureAdmin)
admin.site.register(Badge, BadgeAdmin)
admin.site.register(PlayerBadge, PlayerBadgeAdmin)
admin.site.register(Activity, ActivityAdmin)