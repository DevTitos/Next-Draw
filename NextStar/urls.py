from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
    path('accounts/logout/', views.logout_view, name='logout'),
    path('api/auth/logout/', views.api_logout, name='api_logout'),
    path('', include('gameEngine.urls')),
    path('', include('web3.urls')),
    path('matrix/api/', include('matrix_ceo.urls')),
    path('wallet/api/', include('web3.urls')),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)