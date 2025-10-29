from django.apps import AppConfig


class GameengineConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "gameEngine"

class MyAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gameEngine'

    def ready(self):
        # Import signals
        import gameEngine.signals