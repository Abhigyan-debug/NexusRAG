from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models import KnowledgeGraphNode, KnowledgeGraphEdge

kg_bp = Blueprint("knowledge_graph", __name__, url_prefix="/api/knowledge-graph")


@kg_bp.route("", methods=["GET"])
@jwt_required()
def get_knowledge_graph():
    user_id = int(get_jwt_identity())

    nodes = KnowledgeGraphNode.query.filter_by(user_id=user_id).all()
    edges = KnowledgeGraphEdge.query.filter_by(user_id=user_id).all()

    return jsonify({
        "nodes": [n.to_dict() for n in nodes],
        "edges": [e.to_dict() for e in edges],
        "stats": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "node_types": _count_types(nodes),
        },
    })


def _count_types(nodes):
    types = {}
    for n in nodes:
        types[n.node_type] = types.get(n.node_type, 0) + 1
    return types
