# matrix_ceo/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
import json
from .models import StrategicProject, CEOSelection, StrategicPuzzleMatrix
from web3.models import UserWallet
from hiero.nft import associate_nft, mint_nft
from datetime import timezone, time, datetime
from hiero.mirror_node import get_balance


# views.py - Update matrix_dashboard
@login_required
def matrix_dashboard(request):
    """Get matrix dashboard data"""
    try:
        # Get approved projects
        projects = StrategicProject.objects.filter(status='approved')
        
        # Get user's CEO selections
        user_selections = CEOSelection.objects.filter(candidate=request.user)
        
        projects_data = []
        for project in projects:
            user_selection = user_selections.filter(project=project).first()
            
            projects_data.append({
                'id': project.id,
                'name': project.name,
                'domain': project.domain,
                'vision': project.vision_statement,
                'complexity': project.get_complexity_display(),
                'compensation': project.ceo_compensation,
                'status': project.status,
                'user_application_status': user_selection.status if user_selection else 'not_applied',
                'user_selection_id': user_selection.id if user_selection else None,  # Add this
                'can_apply': not user_selection or user_selection.status in ['rejected', 'withdrawn']
            })
        
        return JsonResponse({
            'success': True,
            'projects': projects_data,
            'user_selections': [
                {
                    'project_name': sel.project.name,
                    'status': sel.status,
                    'score': sel.challenge_score,
                    'selection_id': sel.id,  # Add this
                    'started_at': sel.started_matrix_at.isoformat() if sel.started_matrix_at else None
                } for sel in user_selections
            ]
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def apply_for_ceo(request, project_id):
    """Apply for CEO position - Requires NFT Ticket"""
    try:
        project = get_object_or_404(StrategicProject, id=project_id, status='approved')
        
        # Check if already applied
        existing = CEOSelection.objects.filter(project=project, candidate=request.user).first()
        if existing:
            return JsonResponse({
                'success': False, 
                'error': 'Already applied for this position',
                'current_status': existing.status
            })
        
        # 1. CHECK USER WALLET BALANCE
        user_wallet = get_object_or_404(UserWallet, user=request.user)
        try:
            astra_bal = get_balance(user_wallet.recipient_id)
        except Exception as e:
            astra_bal = 0
            
        # 2. REQUIRE MINIMUM BALANCE FOR NFT MINTING
        if astra_bal < 100:  # Adjust amount as needed
            return JsonResponse({
                'success': False,
                'error': f'Insufficient balance! You need at least 100 STARPOINTS (STA) to apply. Current: {astra_bal}'
            })
        
        # 3. CREATE NFT TICKET FOR CEO APPLICATION
        nft_id = f"NSCEO{project_id}{request.user.id}{int(datetime.time())}"
        ticket_metadata = {
            'name': f'Next Star CEO Application - {project.name}',
            'description': f'CEO application ticket for {project.name}',
            'image': 'https://nextstar.com/ceo-ticket.png',
            'attributes': [
                {'trait_type': 'Project', 'value': project.name},
                {'trait_type': 'Domain', 'value': project.domain},
                {'trait_type': 'Applicant', 'value': request.user.username},
                {'trait_type': 'Application Date', 'value': datetime.now()},
                {'trait_type': 'Ticket Type', 'value': 'CEO_APPLICATION'}
            ]
        }
        
        # 4. MINT NFT TICKET
        nft_result = mint_nft(nft_token_id=nft_id, metadata=ticket_metadata)
        if nft_result['status'] != 'success':
            return JsonResponse({
                'success': False,
                'error': f'Failed to mint application NFT: {nft_result.get("message", "Unknown error")}'
            })
        
        # 5. ASSOCIATE NFT WITH USER WALLET
        associate_result = associate_nft(
            account_id=user_wallet.recipient_id,
            token_id=nft_id,  # Using nft_id as token_id
            account_private_key=user_wallet.decrypt_key(),
            nft_id=nft_result['message']  # The actual NFT ID from minting
        )
        
        if associate_result['status'] != 'success':
            return JsonResponse({
                'success': False,
                'error': f'Failed to associate NFT with wallet: {associate_result.get("message", "Unknown error")}'
            })
        
        # 6. CREATE SERIAL NUMBER FOR TRACKING
        serial_number = f"NS{project_id}{request.user.id}{nft_result.get('serial', '000')}"
        
        # 7. CREATE CEO SELECTION WITH NFT REFERENCE
        selection = CEOSelection.objects.create(
            project=project,
            candidate=request.user,
            status='screening',
            nft_token_id=nft_id,
            nft_serial_number=serial_number,
            application_nft_data={
                'nft_id': nft_result['message'],
                'metadata': ticket_metadata,
                'mint_tx_hash': nft_result.get('transaction_hash'),
                'associate_tx_hash': associate_result.get('transaction_hash')
            }
        )
        
        # 8. START MATRIX CHALLENGE
        selection.start_matrix_challenge()
        
        return JsonResponse({
            'success': True,
            'message': 'Application submitted! Matrix challenge started.',
            'selection_id': selection.id,
            'matrix_session_id': selection.puzzle_matrix.id if hasattr(selection, 'puzzle_matrix') else None,
            'nft_ticket': {
                'nft_id': nft_id,
                'serial_number': serial_number,
                'transaction_hash': nft_result.get('transaction_hash')
            }
        })
    
    except UserWallet.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'User wallet not found. Please set up your wallet first.'
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

# matrix_ceo/views.py
@login_required
def get_matrix_state(request, selection_id):
    """Get current matrix state for CEO selection"""
    try:
        selection = get_object_or_404(CEOSelection, id=selection_id, candidate=request.user)
        
        if selection.status != 'matrix_challenge':
            return JsonResponse({
                'success': False, 
                'error': 'Matrix challenge not started'
            })
        
        # Query using the StrategicPuzzleMatrix's ceo_selection field
        try:
            matrix = StrategicPuzzleMatrix.objects.get(ceo_selection=selection)
        except StrategicPuzzleMatrix.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'No matrix session found'})
        
        current_puzzle = matrix.get_current_puzzle()
        
        return JsonResponse({
            'success': True,
            'selection_id': selection.id,
            'selection_status': selection.status,
            'matrix_progress': {
                'current_node': matrix.current_node,
                'total_nodes': matrix.MATRIX_NODES,
                'strategic_depth': matrix.strategic_depth,
                'paradox_level': matrix.paradox_level,
                'cycles_completed': matrix.cycles_completed,
                'total_decisions': matrix.total_decisions_made
            },
            'current_puzzle': current_puzzle,
            'project_info': {
                'name': selection.project.name,
                'domain': selection.project.domain,
                'vision': selection.project.vision_statement
            }
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

def create_demo_matrix_state(user):
    """Create demo matrix state for testing"""
    from django.utils import timezone
    import random
    
    return {
        'success': True,
        'selection_id': 'demo-' + str(int(timezone.now().timestamp())),
        'selection_status': 'matrix_challenge',
        'matrix_progress': {
            'current_node': random.randint(0, 49),
            'total_nodes': 50,
            'strategic_depth': random.randint(1, 5),
            'paradox_level': random.randint(0, 10),
            'cycles_completed': random.randint(0, 2),
            'total_decisions': random.randint(5, 50)
        },
        'current_puzzle': {
            'node_id': random.randint(0, 49),
            'strategic_depth': random.randint(1, 3),
            'puzzle_data': {
                'type': 'quantum_entanglement',
                'title': f'Quantum Executive Decision Matrix #{random.randint(1, 50)}',
                'scenario': "You're facing multiple simultaneous strategic opportunities in quantum superposition. Each observation collapses possibilities and creates new realities.",
                'quantum_states': [
                    {
                        'state_id': f"q_{i}",
                        'potential': random.randint(20, 150),
                        'entanglement': [f"q_{j}" for j in range(3) if j != i],
                        'observation_cost': f"Loses {random.randint(5, 25)}% of other states",
                        'strategic_implication': f"Creates {random.randint(2, 6)} new decision branches"
                    } for i in range(3)
                ],
                'constraints': [
                    "Observation order affects outcome probabilities",
                    "Each choice creates quantum debt in other dimensions",
                    "The optimal path requires non-sequential thinking"
                ],
                'strategic_question': "What's your quantum observation sequence to maximize preserved strategic potential?",
                'hidden_complexity': "Linear sequences create maximum entropy loss",
                'paradox_trigger': "Chronological observation creates temporal interference"
            },
            'available_approaches': [
                {
                    'id': 'linear_sequential',
                    'name': 'Linear Sequential Observation',
                    'description': 'Observe quantum states in numerical order',
                    'apparent_simplicity': 'Very High',
                    'true_complexity': 'Creates maximum quantum decoherence',
                    'success_rate': '20%',
                    'paradox_risk': 'Extreme',
                    'trap_warning': 'This approach seems obvious but will trap you in lower dimensions'
                },
                {
                    'id': 'entangled_strategy',
                    'name': 'Entangled Strategic Positioning',
                    'description': 'Use quantum entanglement as strategic advantage',
                    'apparent_simplicity': 'Very Low',
                    'true_complexity': 'Creates stable quantum solutions',
                    'success_rate': '81%',
                    'paradox_risk': 'Low',
                    'trap_warning': 'Requires non-linear thinking patterns'
                }
            ],
            'paradox_warnings': [
                "Direct solutions create recursive complexity",
                "Linear thinking increases entropy in non-linear systems"
            ],
            'matrix_context': {
                'total_nodes': 50,
                'current_progress': f"{random.randint(1, 50)}/50",
                'strategic_depth': random.randint(1, 3),
                'paradox_level': random.randint(0, 5),
                'cycles_completed': random.randint(0, 1),
                'eternal_nature': "Solutions create new complexity - the matrix is infinite"
            }
        },
        'project_info': {
            'name': 'Quantum Neural Interface Corporation',
            'domain': 'AI',
            'vision': 'Pioneering human-AI symbiosis through advanced neural interfaces'
        }
    }

@login_required
@require_http_methods(["POST"])
def attempt_puzzle_solution(request, selection_id):
    """Attempt to solve current puzzle node"""
    try:
        data = json.loads(request.body)
        approach_id = data.get('approach_id')
        solution_data = data.get('solution_data', {})
        
        selection = get_object_or_404(CEOSelection, id=selection_id, candidate=request.user)
        
        if not hasattr(selection, 'puzzle_matrix'):
            return JsonResponse({'success': False, 'error': 'No matrix session found'})
        
        matrix = selection.puzzle_matrix
        result = matrix.attempt_solution(approach_id, solution_data)
        
        # Update selection status if matrix completed
        selection.refresh_from_db()
        
        result['selection_status'] = selection.status
        result['matrix_progress'] = {
            'current_node': matrix.current_node,
            'strategic_depth': matrix.strategic_depth,
            'paradox_level': matrix.paradox_level,
            'cycles_completed': matrix.cycles_completed
        }
        
        return JsonResponse(result)
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def matrix_leaderboard(request):
    """Get matrix performance leaderboard"""
    try:
        # Get top performers based on matrix completion
        top_selections = CEOSelection.objects.filter(
            status='board_interview'
        ).order_by('-challenge_score')[:10]
        
        leaderboard = []
        for selection in top_selections:
            if hasattr(selection, 'puzzle_matrix'):
                matrix = selection.puzzle_matrix
                leaderboard.append({
                    'candidate': selection.candidate.username,
                    'project': selection.project.name,
                    'score': selection.challenge_score,
                    'strategic_depth': matrix.strategic_depth,
                    'cycles_completed': matrix.cycles_completed,
                    'total_decisions': matrix.total_decisions_made,
                    'completion_time': selection.completed_matrix_at.isoformat() if selection.completed_matrix_at else None
                })
        
        return JsonResponse({
            'success': True,
            'leaderboard': leaderboard
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def strategic_insights(request, selection_id):
    """Get strategic insights from matrix performance"""
    try:
        selection = get_object_or_404(CEOSelection, id=selection_id, candidate=request.user)
        
        if not hasattr(selection, 'puzzle_matrix'):
            return JsonResponse({'success': False, 'error': 'No matrix session found'})
        
        matrix = selection.puzzle_matrix
        
        insights = {
            'solution_patterns': matrix.solution_patterns[-10:],  # Last 10 patterns
            'strategic_strengths': self.analyze_strengths(matrix),
            'improvement_areas': self.analyze_improvements(matrix),
            'paradox_resolution_rate': self.calculate_paradox_resolution(matrix),
            'dimensional_thinking_score': self.calculate_dimensional_thinking(matrix)
        }
        
        return JsonResponse({
            'success': True,
            'insights': insights
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
    def analyze_strengths(self, matrix):
        strengths = []
        if matrix.cycles_completed > 0:
            strengths.append(f"Completed {matrix.cycles_completed} matrix cycles")
        if matrix.strategic_depth >= 3:
            strengths.append("High strategic depth capability")
        if matrix.paradox_level < 5:
            strengths.append("Effective paradox management")
        return strengths
    
    def analyze_improvements(self, matrix):
        improvements = []
        if matrix.paradox_level > 10:
            improvements.append("Reduce paradox creation in decisions")
        if len(matrix.failed_approaches) > 5:
            improvements.append("Improve initial approach selection")
        if matrix.strategic_depth < 2:
            improvements.append("Develop deeper strategic thinking")
        return improvements
    
    def calculate_paradox_resolution(self, matrix):
        total_decisions = max(1, matrix.total_decisions_made)
        paradox_creation = matrix.paradox_level
        return max(0, 100 - (paradox_creation / total_decisions * 100))
    
    def calculate_dimensional_thinking(self, matrix):
        # Calculate based on solution patterns and strategic depth
        base_score = min(80, matrix.strategic_depth * 20)
        pattern_bonus = min(20, len(matrix.solution_patterns) * 2)
        return base_score + pattern_bonus
    




import uuid

from .models import CEOSelection, NFTPurchase
from hiero.nft import create_nft, mint_nft, associate_nft, create_test_account

@login_required
@require_http_methods(["POST"])
def purchase_ticket(request, selection_id):
    """Purchase an NFT ticket for CEO selection"""
    try:
        selection = get_object_or_404(CEOSelection, id=selection_id, candidate=request.user)
        
        # Check if user already has a ticket for this selection
        existing_purchase = NFTPurchase.objects.filter(
            user=request.user,
            ceo_selection=selection,
            status='completed'
        ).first()
        
        if existing_purchase:
            return JsonResponse({
                'success': False,
                'error': 'You already have a ticket for this selection'
            })
        
        # Load request data
        data = json.loads(request.body)
        ticket_type = data.get('ticket_type', 'standard')  # standard, premium, vip
        
        # Define ticket metadata based on type
        ticket_metadata = {
            'standard': {
                'title': f'CEO Selection Ticket - {selection.project.name}',
                'symbol': 'CEOTKT',
                'price_hbar': 10,
                'benefits': ['Matrix Access', 'Basic Voting Rights']
            },
            'premium': {
                'title': f'CEO Premium Ticket - {selection.project.name}',
                'symbol': 'CEOPRM',
                'price_hbar': 25,
                'benefits': ['Matrix Access', 'Enhanced Voting', 'Priority Support']
            },
            'vip': {
                'title': f'CEO VIP Ticket - {selection.project.name}',
                'symbol': 'CEOvip',
                'price_hbar': 100,
                'benefits': ['Full Matrix Access', 'Maximum Voting Power', 'Exclusive Insights', 'Direct Support']
            }
        }
        
        ticket_info = ticket_metadata.get(ticket_type, ticket_metadata['standard'])
        
        # Create NFT purchase record
        purchase = NFTPurchase.objects.create(
            user=request.user,
            ceo_selection=selection,
            ticket_type=ticket_type,
            price_hbar=ticket_info['price_hbar'],
            status='processing',
            transaction_id=str(uuid.uuid4())
        )
        
        try:
            # Step 1: Create NFT token
            nft_creation = create_nft(
                title=ticket_info['title'],
                symbol=ticket_info['symbol']
            )
            
            if nft_creation['status'] != 'success':
                purchase.status = 'failed'
                purchase.error_message = f"NFT creation failed: {nft_creation.get('message', 'Unknown error')}"
                purchase.save()
                return JsonResponse({
                    'success': False,
                    'error': purchase.error_message
                })
            
            token_id = nft_creation['token_id']
            purchase.token_id = str(token_id)
            purchase.save()
            
            # Step 2: Prepare NFT metadata
            nft_metadata = {
                "name": ticket_info['title'],
                "description": f"CEO Selection Ticket for {selection.project.name}",
                "image": "https://nextstar.com/ceo-ticket.png",  # Replace with actual image URL
                "attributes": [
                    {
                        "trait_type": "Ticket Type",
                        "value": ticket_type.upper()
                    },
                    {
                        "trait_type": "Project",
                        "value": selection.project.name
                    },
                    {
                        "trait_type": "Domain",
                        "value": selection.project.domain
                    },
                    {
                        "trait_type": "Benefits",
                        "value": ", ".join(ticket_info['benefits'])
                    },
                    {
                        "trait_type": "Purchase Date",
                        "value": purchase.created_at.isoformat()
                    }
                ]
            }
            
            # Step 3: Mint NFT
            mint_result = mint_nft(
                nft_token_id=str(token_id),
                metadata=json.dumps(nft_metadata)
            )
            
            if mint_result['status'] != 'success':
                purchase.status = 'failed'
                purchase.error_message = f"NFT minting failed: {mint_result.get('message', 'Unknown error')}"
                purchase.save()
                return JsonResponse({
                    'success': False,
                    'error': purchase.error_message
                })
            
            nft_id = mint_result['message']
            purchase.nft_serial = mint_result['serial']
            purchase.save()
            
            # Step 4: Create user account and associate NFT
            account_result = create_test_account()  # This will need to be modified to use user's account
            if not account_result:
                purchase.status = 'failed'
                purchase.error_message = "Failed to create user account"
                purchase.save()
                return JsonResponse({
                    'success': False,
                    'error': purchase.error_message
                })
            
            account_id, account_private_key = account_result
            
            # Step 5: Associate and transfer NFT to user
            associate_result = associate_nft(
                account_id=str(account_id),
                token_id=str(token_id),
                account_private_key=str(account_private_key),
                nft_id=nft_id
            )
            
            if associate_result and associate_result['status'] == 'success':
                purchase.status = 'completed'
                purchase.user_account_id = str(account_id)
                purchase.save()
                
                # Update CEO selection status if this is the first ticket
                if selection.status == 'pending':
                    selection.status = 'active'
                    selection.save()
                
                return JsonResponse({
                    'success': True,
                    'message': f'{ticket_type.upper()} ticket purchased successfully!',
                    'purchase_id': purchase.id,
                    'ticket_type': ticket_type,
                    'nft_token_id': str(token_id),
                    'nft_serial': mint_result['serial'],
                    'user_account_id': str(account_id),
                    'benefits': ticket_info['benefits']
                })
            else:
                purchase.status = 'failed'
                purchase.error_message = associate_result.get('message', 'NFT association failed')
                purchase.save()
                return JsonResponse({
                    'success': False,
                    'error': purchase.error_message
                })
                
        except Exception as e:
            purchase.status = 'failed'
            purchase.error_message = str(e)
            purchase.save()
            return JsonResponse({
                'success': False,
                'error': f'Ticket purchase failed: {str(e)}'
            })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
def get_ticket_info(request, selection_id):
    """Get ticket information for a CEO selection"""
    try:
        selection = get_object_or_404(CEOSelection, id=selection_id)
        
        # Get user's active ticket for this selection
        user_ticket = NFTPurchase.objects.filter(
            user=request.user,
            ceo_selection=selection,
            status='completed'
        ).first()
        
        # Get all ticket types and prices
        ticket_types = {
            'standard': {
                'name': 'Standard Ticket',
                'price_hbar': 10,
                'benefits': [
                    'Access to CEO Matrix Challenge',
                    'Basic voting rights',
                    'Progress tracking'
                ]
            },
            'premium': {
                'name': 'Premium Ticket', 
                'price_hbar': 25,
                'benefits': [
                    'All Standard benefits',
                    'Enhanced voting power',
                    'Priority support',
                    'Advanced analytics'
                ]
            },
            'vip': {
                'name': 'VIP Ticket',
                'price_hbar': 100, 
                'benefits': [
                    'All Premium benefits',
                    'Maximum voting power',
                    'Exclusive insights',
                    'Direct CEO support',
                    'Early access to features'
                ]
            }
        }
        
        return JsonResponse({
            'success': True,
            'selection_id': selection.id,
            'project_name': selection.project.name,
            'user_has_ticket': user_ticket is not None,
            'user_ticket': {
                'ticket_type': user_ticket.ticket_type if user_ticket else None,
                'purchase_date': user_ticket.created_at.isoformat() if user_ticket else None,
                'nft_token_id': user_ticket.token_id if user_ticket else None,
                'status': user_ticket.status if user_ticket else None
            } if user_ticket else None,
            'available_tickets': ticket_types
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@login_required
def get_user_tickets(request):
    """Get all tickets purchased by the user"""
    try:
        tickets = NFTPurchase.objects.filter(
            user=request.user,
            status='completed'
        ).select_related('ceo_selection', 'ceo_selection__project')
        
        ticket_list = []
        for ticket in tickets:
            ticket_list.append({
                'purchase_id': ticket.id,
                'selection_id': ticket.ceo_selection.id,
                'project_name': ticket.ceo_selection.project.name,
                'ticket_type': ticket.ticket_type,
                'price_hbar': ticket.price_hbar,
                'purchase_date': ticket.created_at.isoformat(),
                'nft_token_id': ticket.token_id,
                'nft_serial': ticket.nft_serial,
                'user_account_id': ticket.user_account_id
            })
        
        return JsonResponse({
            'success': True,
            'tickets': ticket_list,
            'total_tickets': len(ticket_list)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })