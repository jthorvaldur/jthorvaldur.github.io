/* ============================================================================
   kg_farmadrop — shared D3 force-graph helper
   ----------------------------------------------------------------------------
   The recurring force-directed layout used by farmer_drop.html, drop_score.html,
   ledger_structure.html, predict_structure.html, etc. Requires d3@7 and _kit.css.

   Usage:
     <svg id="canvas"></svg>
     <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
     <script src="_graph.js"></script>
     <script>
       const data = await fetch("farmer_drop_graph.json").then(r => r.json());
       forceGraph("#canvas", data);   // data = { nodes:[{id,label,kind,val}], edges:[{source,target,label}] }
     </script>

   Node color keys off `node.kind` and maps to the domain palette in _kit.css:
   conceptual | business | token | data  (add your own in DOMAIN below).
   ============================================================================ */

const DOMAIN = {
  conceptual:'var(--conceptual)', business:'var(--business)',
  token:'var(--token)',           data:'var(--data)',
  _default:'var(--loam-soft)',
};

function forceGraph(selector, {nodes, edges}, opts = {}){
  const svg  = d3.select(selector);
  const box  = svg.node().getBoundingClientRect();
  let   W    = box.width  || 1200;
  let   H    = box.height || 800;

  const rad  = d => 8 + Math.sqrt((d.val ?? 1)) * (opts.radiusScale ?? 6);
  const color= d => DOMAIN[d.kind] ?? DOMAIN._default;

  // zoomable root group
  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([.35, 3.5]).on('zoom', ev => g.attr('transform', ev.transform)));

  const link = g.append('g').attr('stroke', 'var(--line)').attr('stroke-opacity', .8)
    .selectAll('line').data(edges).join('line').attr('stroke-width', 1.2);

  const linkLabel = g.append('g').selectAll('text').data(edges.filter(e => e.label))
    .join('text').attr('class', 'linklabel').attr('text-anchor', 'middle').text(d => d.label);

  const node = g.append('g').selectAll('circle').data(nodes).join('circle')
    .attr('r', rad).attr('fill', color)
    .attr('stroke', 'var(--paper-card)').attr('stroke-width', 1.5)
    .style('cursor', 'grab').call(drag());

  const label = g.append('g').selectAll('text').data(nodes)
    .join('text').attr('class', 'nodelabel').attr('text-anchor', 'middle')
    .attr('dy', d => rad(d) + 13).text(d => d.label ?? d.id);

  const sim = d3.forceSimulation(nodes)
    .force('link',   d3.forceLink(edges).id(d => d.id).distance(l => 70 + (l.dist ?? 0)))
    .force('charge', d3.forceManyBody().strength(opts.charge ?? -460))
    .force('center', d3.forceCenter(W/2, H/2))
    .force('collide',d3.forceCollide().radius(d => rad(d) + 18))
    .on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      linkLabel.attr('x', d => (d.source.x + d.target.x)/2)
               .attr('y', d => (d.source.y + d.target.y)/2);
      node.attr('cx', d => d.x).attr('cy', d => d.y);
      label.attr('x', d => d.x).attr('y', d => d.y);
    });

  // keep centered on resize
  window.addEventListener('resize', () => {
    const b = svg.node().getBoundingClientRect(); W = b.width; H = b.height;
    sim.force('center', d3.forceCenter(W/2, H/2)).alpha(.3).restart();
  });

  function drag(){
    return d3.drag()
      .on('start', (ev,d) => { if(!ev.active) sim.alphaTarget(.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag',  (ev,d) => { d.fx=ev.x; d.fy=ev.y; })
      .on('end',   (ev,d) => { if(!ev.active) sim.alphaTarget(0); d.fx=null; d.fy=null; });
  }

  return { sim, node, link, label };   // handles for filtering / highlighting
}
