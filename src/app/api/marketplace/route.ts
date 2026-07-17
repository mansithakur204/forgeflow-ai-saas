// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Marketplace API Route Controller
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const category = searchParams.get("category") || "";
    const license = searchParams.get("license") || "";
    const minRating = Number(searchParams.get("minRating") || "0");
    const sortBy = searchParams.get("sortBy") || "downloads"; // downloads, rating, name, lastUpdated
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const entries = await forgeFlowService.marketplaceRepository.findAll();

    const items = await Promise.all(
      entries.map(async (entry) => {
        // Cross-reference templatesRepository to verify if installed and check version mismatch
        const installedTpl = await forgeFlowService.templatesRepository.findById(entry.id);
        const installed = !!installedTpl;
        const installedVersion = installedTpl ? installedTpl.version : null;
        const latestVersion = entry.versions[entry.versions.length - 1].version;
        const updateAvailable = installed && installedVersion !== latestVersion;

        return {
          id: entry.id,
          name: entry.name,
          description: entry.description,
          category: entry.category,
          author: entry.author,
          downloads: entry.downloads,
          rating: entry.rating,
          license: entry.license,
          lastUpdated: entry.lastUpdated,
          previewImage: entry.previewImage,
          latestVersion,
          versions: entry.versions,
          reviews: entry.reviews,
          nodes: entry.nodes,
          connections: entry.connections,
          isFavorite: !!entry.isFavorite,
          installed,
          updateAvailable,
          installedVersion,
        };
      })
    );

    let filtered = [...items];

    // Apply Search
    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search) ||
          t.author.toLowerCase().includes(search)
      );
    }

    // Apply Category Filter
    if (category) {
      filtered = filtered.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }

    // Apply License Filter
    if (license) {
      filtered = filtered.filter((t) => t.license.toLowerCase() === license.toLowerCase());
    }

    // Apply Rating Filter
    if (minRating > 0) {
      filtered = filtered.filter((t) => t.rating >= minRating);
    }

    // Apply Sorting
    filtered.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === "lastUpdated") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return NextResponse.json({ success: true, marketplace: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, entryId, rating, comment, author, reason } = body;

    if (!entryId) {
      return NextResponse.json({ success: false, error: "Missing Entry ID" }, { status: 400 });
    }

    const entry = await forgeFlowService.marketplaceRepository.findById(entryId);
    if (!entry) {
      return NextResponse.json({ success: false, error: "Marketplace entry not found" }, { status: 404 });
    }

    const latestVer = entry.versions[entry.versions.length - 1].version;

    // ─── ACTION: INSTALL ───
    if (action === "install") {
      // Simulate cloning blueprint into local templates repository
      await forgeFlowService.templatesRepository.save({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        category: entry.category,
        difficulty: "Intermediate",
        tags: [entry.category, "Marketplace"],
        estimatedRuntime: "5.0s",
        requiredIntegrations: entry.id === "tpl-qualification" ? ["openai", "slack"] : [],
        previewImage: entry.previewImage,
        version: latestVer,
        author: entry.author,
        downloads: entry.downloads,
        rating: entry.rating,
        nodes: entry.nodes,
        connections: entry.connections,
      });

      // Increment downloads tracker on marketplace entry
      entry.downloads += 1;
      await forgeFlowService.marketplaceRepository.save(entry);

      return NextResponse.json({ success: true, message: `Successfully installed "${entry.name}" template v${latestVer}.` });
    }

    // ─── ACTION: UPDATE ───
    if (action === "update") {
      const localTpl = await forgeFlowService.templatesRepository.findById(entryId);
      if (!localTpl) {
        return NextResponse.json({ success: false, error: "Local template not found to update" }, { status: 400 });
      }

      // Overwrite local template nodes, connections and version with latest release
      localTpl.version = latestVer;
      localTpl.nodes = entry.nodes;
      localTpl.connections = entry.connections;

      await forgeFlowService.templatesRepository.save(localTpl);

      return NextResponse.json({ success: true, message: `Successfully updated "${entry.name}" to latest v${latestVer}.` });
    }

    // ─── ACTION: FAVORITE ───
    if (action === "favorite") {
      entry.isFavorite = !entry.isFavorite;
      await forgeFlowService.marketplaceRepository.save(entry);
      return NextResponse.json({ success: true, isFavorite: entry.isFavorite });
    }

    // ─── ACTION: REVIEW & RATE ───
    if (action === "review") {
      if (!author || !rating) {
        return NextResponse.json({ success: false, error: "Missing Reviewer Author or Rating score" }, { status: 400 });
      }

      const newReview = {
        id: `rev-${Date.now()}`,
        author,
        rating: Number(rating),
        comment: comment || "",
        createdAt: new Date().toISOString(),
      };

      entry.reviews.push(newReview);

      // Recalculate average rating score
      const sum = entry.reviews.reduce((acc, r) => acc + r.rating, 0);
      entry.rating = Number((sum / entry.reviews.length).toFixed(1));

      await forgeFlowService.marketplaceRepository.save(entry);
      return NextResponse.json({ success: true, message: "Review posted successfully!" });
    }

    // ─── ACTION: REPORT ───
    if (action === "report") {
      if (!reason) {
        return NextResponse.json({ success: false, error: "Reason for report is required" }, { status: 400 });
      }

      // SRE log incident report
      console.warn(`[Marketplace Report] Incident filed on entry ${entryId}: "${reason}"`);
      return NextResponse.json({ success: true, message: "Template reported successfully. Moderation SRE alerted." });
    }

    return NextResponse.json({ success: false, error: `Invalid action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
