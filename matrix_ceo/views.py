# matrix_ceo/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
import json
from .models import StrategicProject, CEOSelection, StrategicPuzzleMatrix

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
                    'started_at': sel.started_matrix_at.isoformat() if sel.started_matrix_at else None
                } for sel in user_selections
            ]
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@require_http_methods(["POST"])
def apply_for_ceo(request, project_id):
    """Apply for CEO position"""
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
        
        # Create CEO selection
        selection = CEOSelection.objects.create(
            project=project,
            candidate=request.user,
            status='screening'
        )
        
        # Start matrix challenge immediately
        selection.start_matrix_challenge()
        
        return JsonResponse({
            'success': True,
            'message': 'Application submitted! Matrix challenge started.',
            'selection_id': selection.id,
            'matrix_session_id': selection.puzzle_matrix.id
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def get_matrix_state(request, selection_id):
    """Get current matrix state for CEO selection"""
    try:
        selection = get_object_or_404(CEOSelection, id=selection_id, candidate=request.user)
        
        if not hasattr(selection, 'puzzle_matrix'):
            return JsonResponse({'success': False, 'error': 'No matrix session found'})
        
        matrix = selection.puzzle_matrix
        current_puzzle = matrix.get_current_puzzle()
        
        return JsonResponse({
            'success': True,
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