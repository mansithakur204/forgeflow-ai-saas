// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Templates API Route Controller
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const category = searchParams.get("category") || "";
    const difficulty = searchParams.get("difficulty") || "";
    const sortBy = searchParams.get("sortBy") || "downloads"; // downloads, rating, name
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const templates = await forgeFlowService.templatesRepository.findAll();

    let items = [...templates];

    // Apply Search
    if (search) {
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search) ||
          t.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    }

    // Apply Category Filter
    if (category) {
      items = items.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }

    // Apply Difficulty Filter
    if (difficulty) {
      items = items.filter((t) => t.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    // Apply Sorting
    items.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return NextResponse.json({ success: true, templates: items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, templateId, template } = body;

    // ─── ACTION: IMPORT ───
    if (action === "import") {
      if (!template || !template.name) {
        return NextResponse.json({ success: false, error: "Missing or invalid template object data" }, { status: 400 });
      }

      const imported = {
        id: template.id || `tpl-imported-${Date.now()}`,
        name: template.name,
        description: template.description || "Imported workflow template.",
        category: template.category || "Automation",
        difficulty: template.difficulty || "Intermediate",
        tags: template.tags || ["Imported"],
        estimatedRuntime: template.estimatedRuntime || "5.0s",
        requiredIntegrations: template.requiredIntegrations || [],
        previewImage: template.previewImage || "/images/templates/imported.png",
        version: template.version || "1.0.0",
        author: template.author || "User Import",
        downloads: template.downloads || 0,
        rating: template.rating || 5.0,
        nodes: template.nodes || [],
        connections: template.connections || [],
        isFavorite: false,
      };

      await forgeFlowService.templatesRepository.save(imported);
      return NextResponse.json({ success: true, message: `Successfully imported "${imported.name}"` });
    }

    if (!templateId) {
      return NextResponse.json({ success: false, error: "Missing Template ID" }, { status: 400 });
    }

    const tpl = await forgeFlowService.templatesRepository.findById(templateId);
    if (!tpl) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    // ─── ACTION: CREATE WORKFLOW FROM TEMPLATE ───
    if (action === "create-workflow") {
      const newWf = {
        id: `wf-${Date.now()}`,
        name: tpl.name,
        description: tpl.description,
        status: "draft" as const,
        nodeCount: tpl.nodes.length,
        runCount: 0,
        lastRun: null,
        createdAt: new Date().toISOString(),
        tags: tpl.tags,
        nodes: tpl.nodes,
        connections: tpl.connections,
      };

      forgeFlowService.workflows.push(newWf);

      return NextResponse.json({
        success: true,
        workflowId: newWf.id,
        message: `Workflow "${newWf.name}" successfully created from template.`,
      });
    }

    // ─── ACTION: FAVORITE ───
    if (action === "favorite") {
      tpl.isFavorite = !tpl.isFavorite;
      await forgeFlowService.templatesRepository.save(tpl);
      return NextResponse.json({ success: true, isFavorite: tpl.isFavorite });
    }

    // ─── ACTION: DUPLICATE ───
    if (action === "duplicate") {
      const clone = {
        ...tpl,
        id: `${tpl.id}-copy-${Date.now()}`,
        name: `${tpl.name} (Copy)`,
        downloads: 0,
        isFavorite: false,
      };

      await forgeFlowService.templatesRepository.save(clone);
      return NextResponse.json({ success: true, message: `Successfully duplicated "${tpl.name}"` });
    }

    // ─── ACTION: EXPORT ───
    if (action === "export") {
      return NextResponse.json({ success: true, template: tpl });
    }

    return NextResponse.json({ success: false, error: `Invalid action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
