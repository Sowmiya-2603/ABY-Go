// Removes the background around the bottle with the Background Eraser tool.
// The tool samples the colour under its centre (hotspot) and erases only
// similar colours inside the brush, so the hotspot is kept on the background
// while the brush edge reaches over the bottle's outline.
// All strokes stay inside a selection of the background (Select Subject's
// outline, inverted), so the bottle itself is protected.
//   1. far pass   - big brush over the whole background, three times
//   2. rings      - tolerance 100, closing in to the bottle's edge
//   3. edge pass  - loops 5px and 4px outside, tolerance 20/15%, Find Edges,
//                   Protect Foreground Color = the bottle's green
#target photoshop
app.displayDialogs = DialogModes.NO;
app.preferences.rulerUnits = Units.PIXELS;

var dir = "/Users/sowmi-zstch1630/Pictures/ps-bottle";
function cID(s) { return charIDToTypeID(s); }
function sID(s) { return stringIDToTypeID(s); }

var paths = eval("(" + (function () {
    var f = new File(dir + "/paths.json"); f.open("r"); var s = f.read(); f.close(); return s;
})() + ")");

var doc = app.open(new File(dir + "/source.png"));
var PT = 72 / doc.resolution;
var bg = doc.layers[doc.layers.length - 1];
var layer = bg.duplicate();
layer.name = "Bottle (background erased)";
bg.visible = false;
doc.activeLayer = layer;

// Protect Foreground Color uses the foreground swatch: the bottle's green.
var green = new SolidColor(); green.rgb.red = 64; green.rgb.green = 74; green.rgb.blue = 5;
app.foregroundColor = green;

(function selectTool() {
    var r = new ActionReference(); r.putClass(sID("backgroundEraserTool"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    executeAction(cID("slct"), d, DialogModes.NO);
})();

// limits: 0 discontiguous, 1 contiguous, 2 find edges; sampling 0 = continuous
function toolOptions(tolerance, limits, protectFg) {
    var r = new ActionReference(); r.putClass(sID("backgroundEraserTool"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var o = new ActionDescriptor();
    o.putInteger(cID("Tlrn"), tolerance);
    o.putInteger(cID("BECn"), limits);
    o.putInteger(cID("BESm"), 0);
    o.putBoolean(cID("BEPr"), protectFg);
    d.putObject(cID("T   "), sID("currentToolOptions"), o);
    executeAction(cID("setd"), d, DialogModes.NO);
}

function brush(diameter, hardness) {
    var r = new ActionReference(); r.putEnumerated(cID("Brsh"), cID("Ordn"), cID("Trgt"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var b = new ActionDescriptor();
    b.putUnitDouble(sID("masterDiameter"), cID("#Pxl"), diameter);
    b.putUnitDouble(cID("Hrdn"), cID("#Prc"), hardness);
    b.putUnitDouble(cID("Spcn"), cID("#Prc"), 8);
    d.putObject(cID("T   "), cID("Brsh"), b);
    try { executeAction(cID("setd"), d, DialogModes.NO); } catch (e) {}
}

// Long loops go in chunks (Photoshop rejects very long single paths).
function stroke(points) {
    for (var s = 0; s < points.length - 1; s += 300)
        strokeChunk(points.slice(s, Math.min(points.length, s + 301)));
}

function strokeChunk(points) {
    var pts = [];
    for (var i = 0; i < points.length; i++) {
        var q = new PathPointInfo(), a = [points[i][0] * PT, points[i][1] * PT];
        q.kind = PointKind.CORNERPOINT; q.anchor = a; q.leftDirection = a; q.rightDirection = a;
        pts.push(q);
    }
    var sp = new SubPathInfo();
    sp.operation = ShapeOperation.SHAPEADD; sp.closed = false; sp.entireSubPath = pts;
    var path = doc.pathItems.add("bgEraserStroke", [sp]);
    var r = new ActionReference(); r.putName(cID("Path"), "bgEraserStroke");
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    d.putClass(cID("Usng"), sID("backgroundEraserTool"));
    d.putBoolean(cID("Prs "), false);
    executeAction(cID("Strk"), d, DialogModes.NO);
    path.remove();
}

function selectFromMask(name) {
    var src = app.open(new File(dir + "/" + name));
    src.selection.selectAll(); src.selection.copy();
    src.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;
    var tmp = doc.paste();
    var r = new ActionReference(); r.putProperty(cID("Chnl"), cID("fsel"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var t = new ActionReference(); t.putEnumerated(cID("Chnl"), cID("Chnl"), cID("RGB "));
    d.putReference(cID("T   "), t);
    executeAction(cID("setd"), d, DialogModes.NO);
    tmp.remove();
    doc.activeLayer = layer;
}

// The background, as a selection (Select Subject's outline, inverted): every
// stroke stays inside it, so the eraser can never bite into the bottle.
selectFromMask("bg-mask.png");

// 1. far pass over the whole background.
toolOptions(100, 0, false);
brush(160, 100);
var pts = [], row = 0, Wd = doc.width.as("px"), Hd = doc.height.as("px");
for (var y = 0; y <= Hd + 50; y += 50, row++) {
    if (row % 2 == 0) { pts.push([0, y]); pts.push([Wd, y]); }
    else { pts.push([Wd, y]); pts.push([0, y]); }
}
// Even at 100% the tool leaves colours far from its sample (white towel,
// leaves) partly there; repeated passes clear them.
for (var p = 0; p < 6; p++) stroke(pts);

// 2. rings closing in on the bottle, right up to its edge.
toolOptions(100, 0, false);
for (var i = 0; i < paths.rings.length; i++) {
    brush(paths.rings[i].r * 2, 100);
    stroke(paths.rings[i].pts);
    stroke(paths.rings[i].pts);
}

// 3. the edge: hotspot 4-5px out, brush reaching ~1px over the outline.
// Only background-coloured pixels are erased (Find Edges, protect green).
toolOptions(20, 2, true);
brush(12, 100);
stroke(paths.edge);
toolOptions(15, 2, true);
brush(10, 100);
stroke(paths.edge2);
doc.selection.deselect();

var psd = new PhotoshopSaveOptions(); psd.layers = true; psd.embedColorProfile = true;
doc.saveAs(new File(dir + "/bottle-cutout.psd"), psd, true);
doc.saveAs(new File(dir + "/bottle-cutout.png"), new PNGSaveOptions(), true);
var names = [];
for (var i = 0; i < doc.layers.length; i++) names.push(doc.layers[i].name + (doc.layers[i].visible ? "" : " (hidden)"));
doc.close(SaveOptions.DONOTSAVECHANGES);
names.join(" | ");
