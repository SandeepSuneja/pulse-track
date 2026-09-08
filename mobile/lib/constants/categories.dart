import 'package:flutter/material.dart';

class CategoryDef {
  const CategoryDef({
    required this.id,
    required this.label,
    required this.fg,
    required this.bg,
  });

  final String id;
  final String label;
  final Color fg;
  final Color bg;
}

const categories = <CategoryDef>[
  CategoryDef(
    id: 'health',
    label: 'Health',
    fg: Color(0xFF34D399),
    bg: Color(0x4710B981),
  ),
  CategoryDef(
    id: 'learning',
    label: 'Learning',
    fg: Color(0xFFC084FC),
    bg: Color(0x47A855F7),
  ),
  CategoryDef(
    id: 'work',
    label: 'Work',
    fg: Color(0xFF60A5FA),
    bg: Color(0x4D2563EB),
  ),
  CategoryDef(
    id: 'sleep',
    label: 'Sleep',
    fg: Color(0xFFFB7185),
    bg: Color(0x47FB7185),
  ),
  CategoryDef(
    id: 'entertainment',
    label: 'Entertainment',
    fg: Color(0xFF838921),
    bg: Color(0x47FEF2A0),
  ),
  CategoryDef(
    id: 'personal_technical_projects',
    label: 'Personal Technical Projects',
    fg: Color(0xFFFB923C),
    bg: Color(0x47F97316),
  ),
  CategoryDef(
    id: 'ai_content_generation',
    label: 'AI Content Generation',
    fg: Color(0xFF450C3F),
    bg: Color(0x47FFDADA),
  ),
  CategoryDef(
    id: 'others',
    label: 'Others',
    fg: Color(0xFFE2E8F0),
    bg: Color(0x3D94A3B8),
  ),
];

CategoryDef categoryOf(String? id) {
  return categories.firstWhere(
    (c) => c.id == id,
    orElse: () => categories.last,
  );
}

String categoryLabel(String? id) => categoryOf(id).label;

const taskStatuses = <String, String>{
  'todo': 'To Do',
  'in_progress': 'In Progress',
  'completed': 'Done',
};
