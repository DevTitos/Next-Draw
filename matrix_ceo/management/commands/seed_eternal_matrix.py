# matrix_ceo/management/commands/seed_eternal_matrix.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from matrix_ceo.models import CorporateBoard, StrategicProject
from django.utils import timezone
import random
# matrix_ceo/management/commands/seed_eternal_matrix.py

class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Seeding Eternal Matrix with BUSINESS puzzles...')
        
        # Create Corporate Board
        board, created = CorporateBoard.objects.get_or_create(
            name="Global Business Leadership Board",
            defaults={
                'description': 'Oversight board for executive-level business challenges and CEO selection',
                'governance_token': 'BUSINESS-GOV-2024'
            }
        )
        
        # Create Business-Focused Strategic Projects
        strategic_projects = [
            {
                'name': 'Urban Mobility Solutions Inc.',
                'domain': 'Transportation',  # ✅ BUSINESS DOMAIN
                'vision_statement': 'Revolutionize urban transportation through integrated mobility platforms that reduce congestion and improve accessibility in major metropolitan areas.',
                'mission_objectives': [
                    'Deploy in 50 cities across 3 continents by 2026',
                    'Achieve 30% reduction in urban commute times',
                    'Build partnerships with 100+ municipal governments',
                    'Create sustainable revenue model with 40% margins'
                ],
                'success_metrics': {
                    'user_adoption': '10M+ monthly active users by 2027',
                    'revenue_growth': '$800M ARR by 2028',
                    'city_partnerships': '200+ municipal contracts',
                    'environmental_impact': 'Reduce CO2 emissions by 1M tons annually'
                },
                'ceo_compensation': {
                    'equity_shares': 1200000,
                    'base_salary': 420000,
                    'performance_bonus': 'up to 180% of base',
                    'impact_bonus': 'tied to environmental and social metrics'
                },
                'strategic_challenges': [
                    'Navigating complex regulatory environments across different countries',
                    'Competing with ride-sharing giants and public transit systems',
                    'Managing capital-intensive infrastructure deployment',
                    'Balancing profitability with social impact goals'
                ],
                'critical_decisions': [
                    'Focus on developed markets vs emerging economies first',
                    'Build proprietary technology vs partner with existing providers',
                    'Pricing strategy: premium service vs mass market accessibility',
                    'Expansion timing: rapid scale vs sustainable growth'
                ],
                'risk_factors': {
                    'regulatory': 'High - Transportation is heavily regulated',
                    'competitive': 'Very High - Established players with deep pockets',
                    'financial': 'High - Capital intensive business model',
                    'reputation': 'Medium - Public safety and privacy concerns'
                },
                'complexity': 'executive'
            },
            {
                'name': 'Sustainable Agriculture Network',
                'domain': 'Agriculture',  # ✅ BUSINESS DOMAIN
                'vision_statement': 'Transform global food systems through technology-enabled sustainable agriculture that increases yields while reducing environmental impact.',
                'mission_objectives': [
                    'Partner with 10,000 farms across 20 countries by 2027',
                    'Increase crop yields by 25% while reducing water usage by 40%',
                    'Create transparent supply chain from farm to consumer',
                    'Achieve profitability while maintaining 30% lower environmental impact'
                ],
                'success_metrics': {
                    'farmer_partnerships': '10,000+ participating farms',
                    'yield_improvement': '25% average increase',
                    'water_savings': '40% reduction in usage',
                    'supply_chain_efficiency': '50% faster farm-to-market'
                },
                'ceo_compensation': {
                    'equity_shares': 1000000,
                    'base_salary': 380000,
                    'performance_bonus': 'up to 150% of base',
                    'sustainability_bonus': 'tied to environmental impact metrics'
                },
                'strategic_challenges': [
                    'Convincing traditional farmers to adopt new technologies',
                    'Managing seasonal and climate-related uncertainties',
                    'Building trust across complex supply chains',
                    'Balancing technology costs with farmer affordability'
                ],
                'critical_decisions': [
                    'Focus on high-value crops vs staple foods',
                    'Technology licensing model vs full integration',
                    'Geographic expansion strategy',
                    'Partnership approach with agricultural corporations'
                ],
                'risk_factors': {
                    'climate': 'Very High - Weather and climate dependencies',
                    'adoption': 'High - Resistance to change in traditional industry',
                    'supply_chain': 'High - Complex global logistics',
                    'commodity_prices': 'Medium - Market volatility'
                },
                'complexity': 'senior'
            },
            {
                'name': 'Healthcare Access Platform',
                'domain': 'Healthcare',  # ✅ BUSINESS DOMAIN
                'vision_statement': 'Democratize healthcare access through technology platforms that connect patients with providers and streamline medical services delivery.',
                'mission_objectives': [
                    'Serve 5 million patients across underserved regions by 2026',
                    'Reduce healthcare delivery costs by 35% through technology',
                    'Partner with 500+ healthcare providers and insurers',
                    'Maintain 99.9% platform reliability for critical services'
                ],
                'success_metrics': {
                    'patient_impact': '5M+ patients served',
                    'cost_reduction': '35% lower delivery costs',
                    'provider_network': '500+ healthcare partners',
                    'service_reliability': '99.9% uptime'
                },
                'ceo_compensation': {
                    'equity_shares': 1500000,
                    'base_salary': 480000,
                    'performance_bonus': 'up to 200% of base',
                    'impact_bonus': 'tied to patient outcomes and access metrics'
                },
                'strategic_challenges': [
                    'Navigating complex healthcare regulations across jurisdictions',
                    'Building trust with both patients and medical professionals',
                    'Managing data privacy and security for sensitive health information',
                    'Creating sustainable business model in price-sensitive markets'
                ],
                'critical_decisions': [
                    'Focus on specific medical specialties vs comprehensive care',
                    'B2B partnerships with insurers vs direct-to-consumer approach',
                    'Geographic market prioritization',
                    'Technology build vs buy decisions for specialized medical features'
                ],
                'risk_factors': {
                    'regulatory': 'Extreme - Healthcare is highly regulated',
                    'liability': 'Very High - Medical malpractice and data privacy risks',
                    'adoption': 'High - Resistance from established healthcare systems',
                    'technical': 'High - Complex integration requirements'
                },
                'complexity': 'executive'
            }
        ]

        for project_data in strategic_projects:
            project, created = StrategicProject.objects.get_or_create(
                name=project_data['name'],
                board=board,
                defaults=project_data
            )
            
            if created:
                project.approve_project()
                self.stdout.write(self.style.SUCCESS(f'Created business project: {project.name}'))