# matrix_ceo/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid
import hashlib
import random
import json

class CorporateBoard(models.Model):
    """Board of Directors that owns and governs projects"""
    name = models.CharField(max_length=200)
    description = models.TextField()
    established_date = models.DateTimeField(auto_now_add=True)
    governance_token = models.CharField(max_length=100, unique=True)
    
    class Meta:
        db_table = 'corporate_boards'
    
    def __str__(self):
        return self.name

class StrategicProject(models.Model):
    """Board-approved projects ready for CEO leadership"""
    STATUS_CHOICES = [
        ('draft', 'Draft - Board Review'),
        ('approved', 'Approved - Seeking CEO'),
        ('active', 'Active - CEO Leading'),
        ('paused', 'Paused - Board Review'),
        ('completed', 'Completed - Success'),
        ('terminated', 'Terminated - Failed'),
    ]
    
    COMPLEXITY_CHOICES = [
        ('entry', 'Entry Level (1-2 years experience)'),
        ('mid', 'Mid Level (3-5 years experience)'), 
        ('senior', 'Senior Level (5-8 years experience)'),
        ('executive', 'Executive Level (8+ years experience)'),
    ]
    
    # Project Identity
    name = models.CharField(max_length=200)
    domain = models.CharField(max_length=100)
    vision_statement = models.TextField()
    mission_objectives = models.JSONField(default=list)
    success_metrics = models.JSONField(default=dict)
    
    # Corporate Structure
    board = models.ForeignKey(CorporateBoard, on_delete=models.CASCADE, related_name='projects')
    
    # CEO Position Details
    ceo_compensation = models.JSONField(default=dict)
    term_duration = models.IntegerField(default=24)
    reporting_structure = models.JSONField(default=dict)
    
    # Strategic Challenges
    complexity = models.CharField(max_length=20, choices=COMPLEXITY_CHOICES, default='mid')
    strategic_challenges = models.JSONField(default=list)
    critical_decisions = models.JSONField(default=list)
    risk_factors = models.JSONField(default=dict)
    
    # Status & Governance
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Current Leadership
    active_ceo = models.ForeignKey('CEOSelection', on_delete=models.SET_NULL, null=True, blank=True, related_name='active_projects')
    
    class Meta:
        db_table = 'strategic_projects'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.board.name})"
    
    def approve_project(self):
        if self.status == 'draft':
            self.status = 'approved'
            self.approved_at = timezone.now()
            self.save()

class CEOSelection(models.Model):
    """Process of selecting CEO for a project"""
    STATUS_CHOICES = [
        ('screening', 'Candidate Screening'),
        ('matrix_challenge', 'Matrix Challenge Phase'),
        ('board_interview', 'Board Interview'),
        ('reference_check', 'Reference & Background Check'),
        ('offer_extended', 'Offer Extended'),
        ('accepted', 'Accepted - Active CEO'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Candidate Withdrew'),
    ]
    
    project = models.ForeignKey(StrategicProject, on_delete=models.CASCADE, related_name='ceo_selections')
    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ceo_applications')
    
    # Selection Process
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='screening')
    application_date = models.DateTimeField(auto_now_add=True)

    # Matrix Challenge Performance
    challenge_score = models.IntegerField(default=0)
    strategic_insights = models.JSONField(default=list)
    
    # Board Evaluation
    board_interview_score = models.IntegerField(null=True, blank=True)
    reference_score = models.IntegerField(null=True, blank=True)
    final_decision = models.TextField(blank=True)
    
    # Timeline
    started_matrix_at = models.DateTimeField(null=True, blank=True)
    completed_matrix_at = models.DateTimeField(null=True, blank=True)
    decision_date = models.DateTimeField(null=True, blank=True)

    nft_token_id = models.CharField(max_length=100, blank=True, null=True)
    nft_serial_number = models.CharField(max_length=100, blank=True, null=True)
    application_nft_data = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'ceo_selections'
        unique_together = ['project', 'candidate']
    
    def __str__(self):
        return f"{self.candidate.username} for {self.project.name}"
    
    def start_matrix_challenge(self):
        if self.status == 'screening':
            self.status = 'matrix_challenge'
            self.started_matrix_at = timezone.now()
            
            # Create strategic puzzle matrix - it will automatically link via ceo_selection field
            StrategicPuzzleMatrix.objects.create(ceo_selection=self)
            self.save()
    
    def complete_matrix_challenge(self, score, insights):
        if self.status == 'matrix_challenge':
            self.status = 'board_interview'
            self.completed_matrix_at = timezone.now()
            self.challenge_score = score
            self.strategic_insights = insights
            self.save()


class StrategicPuzzleMatrix(models.Model):
    """50-node eternal business puzzle matrix - Only one true path for the best CEOs"""
    
    MATRIX_NODES = 50
    PUZZLE_TYPES = [
        ('market_dominance', 'Market Dominance Strategy'),
        ('financial_turnaround', 'Financial Turnaround Puzzle'),
        ('merger_acquisition', 'Merger & Acquisition Dilemma'),
        ('innovation_paradox', 'Innovation vs Execution Paradox'),
        ('talent_management', 'Talent Management Crisis'),
    ]
    
    ceo_selection = models.OneToOneField(CEOSelection, on_delete=models.CASCADE, related_name='puzzle_matrix')
    current_node = models.IntegerField(default=0)
    completed_nodes = models.JSONField(default=list)
    node_states = models.JSONField(default=dict)
    strategic_depth = models.IntegerField(default=1)
    paradox_level = models.IntegerField(default=0)
    solution_patterns = models.JSONField(default=list)
    failed_approaches = models.JSONField(default=list)
    cycles_completed = models.IntegerField(default=0)
    total_decisions_made = models.IntegerField(default=0)
    cumulative_complexity = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    def get_current_puzzle(self):
        """Get the current puzzle for the CEO"""
        if self.current_node >= self.MATRIX_NODES:
            self.current_node = 0
            self.cycles_completed += 1
            self.strategic_depth += 1
            self.save()
        
        puzzle_data = self.generate_node_puzzle(self.current_node)
        available_approaches = self.generate_available_approaches(puzzle_data)
        
        return {
            'node_id': self.current_node,
            'node_number': self.current_node + 1,  # Human-readable
            'total_nodes': self.MATRIX_NODES,
            'puzzle_data': puzzle_data,
            'available_approaches': available_approaches,
            'strategic_depth': self.strategic_depth,
            'paradox_level': self.paradox_level
        }
    
    def generate_node_puzzle(self, node_id):
        """Generate real business puzzles for CEOs"""
        puzzle_seed = f"{self.ceo_selection.project.domain}_{node_id}_{self.strategic_depth}"
        random.seed(hashlib.md5(puzzle_seed.encode()).hexdigest())
        
        puzzle_type = random.choice(self.PUZZLE_TYPES)[0]
        
        # Call the puzzle generation methods directly
        if puzzle_type == 'market_dominance':
            puzzle = self._generate_market_dominance_puzzle(node_id)
        elif puzzle_type == 'financial_turnaround':
            puzzle = self._generate_financial_turnaround_puzzle(node_id)
        elif puzzle_type == 'merger_acquisition':
            puzzle = self._generate_merger_puzzle(node_id)
        elif puzzle_type == 'innovation_paradox':
            puzzle = self._generate_innovation_puzzle(node_id)
        elif puzzle_type == 'talent_management':
            puzzle = self._generate_talent_puzzle(node_id)
        else:
            # Fallback to market dominance
            puzzle = self._generate_market_dominance_puzzle(node_id)
        
        # Add eternal complexity layers
        for i in range(self.strategic_depth):
            puzzle = self._add_business_complexity(puzzle, i)
        
        return puzzle
    
    def _generate_market_dominance_puzzle(self, node_id):
        """Puzzle: Capture market against entrenched competitors"""
        return {
            'type': 'market_dominance',
            'title': f'The David vs Goliath Gambit #{node_id + 1}',
            'scenario': f"You're launching in a market dominated by 3 giants controlling 85% share. They have 10x your budget, established distribution, and brand loyalty. Your differentiator is superior technology that's 2 years ahead, but customers don't know it yet.",
            'market_data': {
                'incumbent_1': {'market_share': '38%', 'strength': 'Brand recognition', 'weakness': 'Slow innovation'},
                'incumbent_2': {'market_share': '32%', 'strength': 'Distribution network', 'weakness': 'High prices'},
                'incumbent_3': {'market_share': '15%', 'strength': 'Customer loyalty', 'weakness': 'Aging product line'},
                'your_position': {'market_share': '0.5%', 'budget': '$5M', 'time_advantage': '24 months'}
            },
            'constraints': [
                "You have 6 months to reach 5% market share or funding dries up",
                "Direct comparison marketing makes you look desperate",
                "Price wars would bankrupt you in 3 months",
                f"Success here unlocks partnerships in nodes {[(node_id + i) % 50 + 1 for i in range(5, 11)]}"
            ],
            'strategic_question': "What's your market entry strategy that leverages your tech advantage without triggering competitive retaliation?",
            'hidden_trap': "Going after the weakest competitor first makes you an easy target for the strong ones",
            'eternal_aspect': "Market dynamics shift with each move - the optimal path changes constantly"
        }
    
    def _generate_financial_turnaround_puzzle(self, node_id):
        """Puzzle: Save a company from bankruptcy"""
        return {
            'type': 'financial_turnaround',
            'title': f'The Phoenix Gambit #{node_id + 1}',
            'scenario': f"You've taken over a company with: $50M debt, 6 months cash runway, 40% employee turnover, and declining sales for 8 quarters. The board wants profitability in 12 months. You have one secret weapon: proprietary data showing untapped customer segments.",
            'financial_snapshot': {
                'cash_burn': '$2M/month',
                'debt_service': '$1.5M/month',
                'customer_acquisition_cost': '$500 (rising)',
                'customer_lifetime_value': '$1200 (falling)',
                'key_assets': ['Proprietary customer data', 'Strong engineering team', 'Underutilized patents']
            },
            'crisis_points': [
                "Payroll due in 3 weeks - need $4M",
                "Key client threatening to leave - represents 30% revenue",
                "Regulatory audit in 60 days - potential fines up to $10M",
                "Top 3 executives resigned last month"
            ],
            'strategic_question': "What's your 90-day survival plan that preserves long-term viability while addressing immediate crises?",
            'hidden_trap': "Cutting costs too aggressively destroys the innovation engine needed for recovery",
            'eternal_aspect': "Each financial decision creates ripple effects that change future options"
        }
    
    def _generate_merger_puzzle(self, node_id):
        """Puzzle: Navigate a complex merger"""
        return {
            'type': 'merger_acquisition',
            'title': f'The Corporate Marriage #{node_id + 1}',
            'scenario': f"You're acquiring a competitor for strategic expansion. Their tech complements yours, but cultures clash dramatically. Your due diligence revealed: 25% of their revenue comes from one client (who hates your brand), their best engineers have 90-day retention clauses, and there's a hidden $15M liability.",
            'merger_dynamics': {
                'your_culture': 'Innovation-driven, fast-paced, remote-first',
                'their_culture': 'Process-heavy, hierarchical, office-centric',
                'valuation_gap': 'You value them at $200M, they want $280M',
                'integration_timeline': '18 months planned, market expects 12'
            },
            'deal_breakers': [
                "Founder demands board seat for 5 years",
                "Key patent ownership disputed by former employee",
                "Regulatory approval uncertain in 3 major markets",
                "Your CFO and their CEO publicly clashed at industry event"
            ],
            'strategic_question': "How do you structure the deal to capture synergies while managing cultural integration and hidden risks?",
            'hidden_trap': "Focusing only on financial terms ignores the human capital flight risk",
            'eternal_aspect': "Merger success depends on unpredictable human factors that evolve daily"
        }
    
    def _generate_innovation_puzzle(self, node_id):
        """Puzzle: Balance innovation with execution"""
        return {
            'type': 'innovation_paradox',
            'title': f'The Innovator\'s Dilemma #{node_id + 1}',
            'scenario': f"Your core product generates 80% of revenue but is being disrupted by new technology. You have a breakthrough innovation ready, but launching it would cannibalize existing business. Meanwhile, 3 startups are preparing similar products with 6-month head starts.",
            'innovation_landscape': {
                'current_product': {'revenue': '$100M/year', 'growth': '5%', 'margins': '35%'},
                'new_innovation': {'potential_revenue': '$250M/year', 'cannibalization_rate': '40%', 'time_to_market': '9 months'},
                'competitive_threats': [
                    {'startup': 'NimbleTech', 'funding': '$30M', 'launch': '6 months'},
                    {'startup': 'FutureLabs', 'funding': '$45M', 'launch': '8 months'},
                    {'startup': 'VisionaryInc', 'funding': '$60M', 'launch': '7 months'}
                ]
            },
            'strategic_question': "Do you accelerate the innovation (risking current business) or defend the core (risking disruption)? What's your phased approach?",
            'hidden_trap': "Trying to do both equally ensures you fail at both",
            'eternal_aspect': "The innovation timing window shifts with each market signal and competitive move"
        }
    
    def _generate_talent_puzzle(self, node_id):
        """Puzzle: Manage talent crisis during growth"""
        return {
            'type': 'talent_management',
            'title': f'The Brain Drain Crisis #{node_id + 1}',
            'scenario': f"Your top 15% performers are being poached by competitors offering 50% higher compensation. Meanwhile, you need to triple engineering capacity for a new product launch. Company morale is falling, and your HR head just resigned.",
            'talent_landscape': {
                'critical_roles_at_risk': ['CTO', 'Head of Product', 'Lead Architects'],
                'recruiting_pipeline': '6 months for senior roles',
                'training_time': '12 months for internal promotions',
                'culture_metrics': {'engagement': '45%', 'turnover': '28%', 'referral_rate': '8%'}
            },
            'immediate_crises': [
                "Lead architect gave notice - knows all system architecture",
                "Product launch delayed by 3 months due to staffing",
                "Board questioning leadership stability",
                "Industry rumors affecting candidate interest"
            ],
            'strategic_question': "What's your talent retention and acquisition strategy that addresses immediate crises while building sustainable culture?",
            'hidden_trap': "Matching competitor offers creates unsustainable compensation inflation",
            'eternal_aspect': "Talent dynamics create compound effects - each departure makes retention harder"
        }

    def generate_available_approaches(self, puzzle_data):
        """Generate business strategy approaches"""
        puzzle_type = puzzle_data['type']
        
        approaches = {
            'market_dominance': [
                {
                    'id': 'direct_assault',
                    'name': 'Direct Market Assault',
                    'description': 'Challenge incumbents head-on with aggressive marketing and pricing',
                    'apparent_simplicity': 'Straightforward and decisive',
                    'true_complexity': 'Triggers immediate competitive retaliation from all players',
                    'success_rate': '8%',
                    'failure_consequence': 'Resource depletion within 3 months',
                    'trap_warning': 'Feels bold but guarantees united opposition'
                },
                {
                    'id': 'stealth_infiltration',
                    'name': 'Stealth Market Infiltration',
                    'description': 'Target overlooked customer segments and build quietly',
                    'apparent_simplicity': 'Seems slow and cautious',
                    'true_complexity': 'Requires perfect timing and segment identification',
                    'success_rate': '35%',
                    'failure_consequence': 'Missed market window',
                    'trap_warning': 'Easy to remain permanently niche'
                },
                {
                    'id': 'ecosystem_partnership',
                    'name': 'Ecosystem Partnership Strategy',
                    'description': 'Partner with complementary players to create new market space',
                    'apparent_simplicity': 'Appears complex and uncertain',
                    'true_complexity': 'Creates defensible market position through networks',
                    'success_rate': '72%',
                    'failure_consequence': 'Partnership complications',
                    'trap_warning': 'Requires giving up some control and margin'
                }
            ],
            'financial_turnaround': [
                {
                    'id': 'brutal_cost_cutting',
                    'name': 'Brutal Cost Optimization',
                    'description': 'Cut all non-essential costs immediately to extend runway',
                    'apparent_simplicity': 'Direct and shows immediate action',
                    'true_complexity': 'Destroys innovation capacity and morale',
                    'success_rate': '15%',
                    'failure_consequence': 'Talent exodus and product stagnation',
                    'trap_warning': 'Saves the company but kills its future'
                },
                {
                    'id': 'selective_investment',
                    'name': 'Selective Growth Investment',
                    'description': 'Double down on highest-potential areas while cutting others',
                    'apparent_simplicity': 'Seems balanced and strategic',
                    'true_complexity': 'Requires perfect judgment of what to keep',
                    'success_rate': '45%',
                    'failure_consequence': 'Wrong bets accelerate failure',
                    'trap_warning': 'One wrong choice collapses everything'
                },
                {
                    'id': 'strategic_pivot',
                    'name': 'Complete Business Model Pivot',
                    'description': 'Use hidden assets to create entirely new revenue streams',
                    'apparent_simplicity': 'Appears risky and desperate',
                    'true_complexity': 'The only path to true transformation',
                    'success_rate': '68%',
                    'failure_consequence': 'Confusion and execution risk',
                    'trap_warning': 'Requires convincing stakeholders to abandon the past'
                }
            ],
            'merger_acquisition': [
                {
                    'id': 'full_integration',
                    'name': 'Full Integration Approach',
                    'description': 'Absorb the acquired company completely into your culture',
                    'apparent_simplicity': 'Clean and efficient',
                    'true_complexity': 'Destroys the unique value you acquired',
                    'success_rate': '22%',
                    'failure_consequence': 'Key talent departure and culture clash',
                    'trap_warning': 'Kills the golden goose through process'
                },
                {
                    'id': 'hands_off',
                    'name': 'Hands-Off Autonomy',
                    'description': 'Let acquired company operate independently',
                    'apparent_simplicity': 'Preserves what you bought',
                    'true_complexity': 'No synergy capture and eventual friction',
                    'success_rate': '38%',
                    'failure_consequence': 'Missed integration benefits',
                    'trap_warning': 'Pay premium for no strategic gain'
                },
                {
                    'id': 'hybrid_culture',
                    'name': 'Hybrid Culture Creation',
                    'description': 'Create new combined culture taking best from both',
                    'apparent_simplicity': 'Seems idealistic and slow',
                    'true_complexity': 'The only path to 1+1=3 outcomes',
                    'success_rate': '75%',
                    'failure_consequence': 'Initial confusion and resistance',
                    'trap_warning': 'Requires exceptional leadership through uncertainty'
                }
            ],
            'innovation_paradox': [
                {
                    'id': 'defend_core',
                    'name': 'Defend the Core Business',
                    'description': 'Focus resources on protecting existing revenue streams',
                    'apparent_simplicity': 'Protects current business and cash flow',
                    'true_complexity': 'Leaves you vulnerable to disruption',
                    'success_rate': '20%',
                    'failure_consequence': 'Becoming irrelevant in 2-3 years',
                    'trap_warning': 'Short-term safety leads to long-term failure'
                },
                {
                    'id': 'bet_on_innovation',
                    'name': 'Bet Everything on Innovation',
                    'description': 'Go all-in on the new technology and business model',
                    'apparent_simplicity': 'Aggressive and forward-thinking',
                    'true_complexity': 'Risk of destroying current business prematurely',
                    'success_rate': '30%',
                    'failure_consequence': 'Losing both old and new markets',
                    'trap_warning': 'Too much transformation too fast'
                },
                {
                    'id': 'balanced_portfolio',
                    'name': 'Balanced Innovation Portfolio',
                    'description': 'Run both businesses with separate teams and metrics',
                    'apparent_simplicity': 'Seems like the safe middle ground',
                    'true_complexity': 'Requires perfect resource allocation and timing',
                    'success_rate': '70%',
                    'failure_consequence': 'Internal conflict and resource drain',
                    'trap_warning': 'Most difficult to execute properly'
                }
            ],
            'talent_management': [
                {
                    'id': 'financial_incentives',
                    'name': 'Financial Incentives Focus',
                    'description': 'Match competitor offers and create retention bonuses',
                    'apparent_simplicity': 'Directly addresses compensation gap',
                    'true_complexity': 'Creates unsustainable cost structure',
                    'success_rate': '25%',
                    'failure_consequence': 'Profitability crisis in 12 months',
                    'trap_warning': 'Money alone doesn\'t build loyalty'
                },
                {
                    'id': 'aggressive_recruiting',
                    'name': 'Aggressive External Recruiting',
                    'description': 'Hire rapidly from competitors and market',
                    'apparent_simplicity': 'Quickly fills open positions',
                    'true_complexity': 'Cultural dilution and integration challenges',
                    'success_rate': '40%',
                    'failure_consequence': 'High new hire turnover',
                    'trap_warning': 'New hires don\'t solve cultural problems'
                },
                {
                    'id': 'culture_transformation',
                    'name': 'Culture and Development Focus',
                    'description': 'Invest in culture, development, and internal growth',
                    'apparent_simplicity': 'Seems slow and intangible',
                    'true_complexity': 'The only sustainable talent strategy',
                    'success_rate': '75%',
                    'failure_consequence': 'Initial slower hiring pace',
                    'trap_warning': 'Requires patience and consistent leadership'
                }
            ]
        }
        
        return approaches.get(puzzle_type, self._generate_default_approaches())
    
    def _generate_default_approaches(self):
        """Default business approaches"""
        return [
            {
                'id': 'conventional_wisdom',
                'name': 'Conventional Wisdom',
                'description': 'Apply standard industry practices and best practices',
                'apparent_simplicity': 'Safe and proven',
                'true_complexity': 'Guarantees mediocre results in extraordinary situations',
                'success_rate': '25%',
                'failure_consequence': 'Missed opportunity for breakthrough',
                'trap_warning': 'What worked for others won\'t work for unique challenges'
            },
            {
                'id': 'bold_innovation',
                'name': 'Bold Innovation',
                'description': 'Create completely new approach tailored to the situation',
                'apparent_simplicity': 'Risky and unproven',
                'true_complexity': 'The only path to extraordinary outcomes',
                'success_rate': '65%',
                'failure_consequence': 'Higher initial uncertainty',
                'trap_warning': 'Requires courage to defy convention'
            }
        ]
    
    def _add_business_complexity(self, puzzle, layer_index):
        """Add business complexity layers"""
        complexity_enhancements = [
            "Add stakeholder alignment challenges",
            "Introduce regulatory compliance complications", 
            "Include unexpected competitive moves",
            "Add talent retention complications",
            "Introduce supply chain disruptions",
            "Include currency and geopolitical risks",
            "Add customer behavior unpredictability"
        ]
        
        enhancement = random.choice(complexity_enhancements)
        puzzle['complexity_layers'] = puzzle.get('complexity_layers', [])
        puzzle['complexity_layers'].append(f"Layer {layer_index + 1}: {enhancement}")
        
        return puzzle
    
    def attempt_solution(self, approach_id, solution_data):
        """Attempt solution with business-focused evaluation"""
        current_puzzle = self.get_current_puzzle()
        
        # Analyze CEO thinking quality
        quality = self.analyze_business_acumen(approach_id, solution_data, current_puzzle)
        
        # The Eternal Matrix: Only one true path advances without penalties
        if quality >= 85 and self.is_optimal_path(approach_id, current_puzzle):
            return self.true_ceo_advancement(approach_id, solution_data, quality)
        elif quality >= 60:
            return self.partial_advancement_with_penalty(approach_id, solution_data, quality)
        else:
            return self.ceo_trap_activation(approach_id, solution_data, quality)
    
    def analyze_business_acumen(self, approach_id, solution_data, puzzle):
        """Analyze CEO-level strategic thinking"""
        quality = 50  # Base
        
        # Penalize conventional thinking in novel situations
        if any(keyword in approach_id for keyword in ['conventional', 'direct', 'brutal']):
            quality -= 25
        
        # Reward innovative and nuanced approaches
        if any(keyword in approach_id for keyword in ['ecosystem', 'hybrid', 'strategic', 'pivot']):
            quality += 30
        
        # Analyze solution sophistication
        stakeholder_consideration = len(solution_data.get('stakeholders_considered', []))
        time_horizon_planning = solution_data.get('planning_horizon', 0)  # months
        risk_mitigation_count = len(solution_data.get('risk_mitigations', []))
        
        quality += min(20, stakeholder_consideration * 4)
        quality += min(15, time_horizon_planning // 6)  # +1 for each 6 months horizon
        quality += min(15, risk_mitigation_count * 3)
        
        # Strategic depth bonus
        quality += min(20, self.strategic_depth * 4)
        
        return max(0, min(100, quality))
    
    def is_optimal_path(self, approach_id, puzzle):
        """Determine if this is the one true optimal path"""
        # Only one approach per puzzle type leads to true advancement
        optimal_paths = {
            'market_dominance': 'ecosystem_partnership',
            'financial_turnaround': 'strategic_pivot', 
            'merger_acquisition': 'hybrid_culture',
            'innovation_paradox': 'balanced_portfolio',
            'talent_management': 'culture_transformation'
        }
        
        puzzle_type = puzzle['puzzle_data']['type']
        return optimal_paths.get(puzzle_type) == approach_id
    
    def true_ceo_advancement(self, approach_id, solution_data, quality):
        """The one true path - perfect CEO advancement"""
        self.completed_nodes.append({
            'node_id': self.current_node,
            'approach': approach_id,
            'quality': quality,
            'strategic_depth': self.strategic_depth,
            'breakthrough': True,
            'eternal_insight': self.generate_eternal_insight(),
            'timestamp': timezone.now().isoformat()
        })
        
        self.current_node += 1
        self.total_decisions_made += 1
        
        # Eternal progression - matrix gets smarter
        if self.current_node >= self.MATRIX_NODES:
            self.current_node = 0
            self.cycles_completed += 1
            self.strategic_depth += 1
        
        self.solution_patterns.append({
            'cycle': self.cycles_completed,
            'node': self.current_node,
            'ceo_pattern': self.identify_ceo_pattern(approach_id)
        })
        
        self.save()
        
        return {
            'success': True,
            'message': f"🎯 PERFECT CEO EXECUTION! Advanced to Node {self.current_node + 1}",
            'breakthrough': "You found the one true strategic path",
            'eternal_insight': self.generate_eternal_insight(),
            'matrix_evolution': f"Matrix depth increased to {self.strategic_depth}",
            'next_challenge': self.get_current_puzzle() if self.current_node < self.MATRIX_NODES else None
        }
    
    def generate_eternal_insight(self):
        """Generate eternal business wisdom"""
        insights = [
            "True strategy emerges when you stop following and start leading",
            "The optimal path is always counter-intuitive to conventional wisdom", 
            "Great CEOs don't solve problems - they transform situations",
            "The matrix rewards those who see patterns others miss",
            "Eternal success comes from embracing complexity, not avoiding it"
        ]
        return random.choice(insights)
    
    def identify_ceo_pattern(self, approach_id):
        """Identify CEO strategic patterns"""
        patterns = {
            'ecosystem': 'Ecosystem Architecture',
            'hybrid': 'Synthesis Thinking', 
            'strategic': 'Strategic Foresight',
            'pivot': 'Transformation Leadership',
            'culture': 'Cultural Engineering'
        }
        
        for key, pattern in patterns.items():
            if key in approach_id:
                return pattern
        
        return 'Visionary Leadership'
    
    
class NFTPurchase(models.Model):
    TICKET_TYPES = [
        ('standard', 'Standard Ticket'),
        ('premium', 'Premium Ticket'),
        ('vip', 'VIP Ticket'),
    ]
    
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='nft_purchases')
    ceo_selection = models.ForeignKey(CEOSelection, on_delete=models.CASCADE, related_name='nft_purchases')
    ticket_type = models.CharField(max_length=20, choices=TICKET_TYPES, default='standard')
    price_hbar = models.DecimalField(max_digits=10, decimal_places=2)
    token_id = models.CharField(max_length=100, blank=True, null=True)
    nft_serial = models.BigIntegerField(blank=True, null=True)
    user_account_id = models.CharField(max_length=100, blank=True, null=True)
    transaction_id = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'ceo_selection', 'status']
    
    def __str__(self):
        return f"{self.user.username} - {self.ticket_type} - {self.ceo_selection.project.name}"