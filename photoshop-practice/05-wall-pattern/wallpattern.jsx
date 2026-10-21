// Applies a wall pattern to the marked area with the Pattern Stamp tool.
//  1. Builds a seamless tile from the existing texture (one 128px piece,
//     mirrored 2x2 so the chevrons meet cleanly) and defines it as a pattern.
//  2. Paints it into the marked area with Pattern Stamp strokes, on its own
//     layer, covering the dashed guide line.
//  3. Masks the plant leaves so they stay in front, and adds a Linear Light
//     layer that carries the room's lighting onto the pattern.
#target photoshop
app.displayDialogs = DialogModes.NO;
app.preferences.rulerUnits = Units.PIXELS;

var dir = "/Users/sowmi-zstch1630/Pictures/ps-wallpattern";
var PATTERN = "Wall chevron";
var BOX = [508, 40, 1057, 616]; // marked area incl. its dashed outline

function cID(s) { return charIDToTypeID(s); }
function sID(s) { return stringIDToTypeID(s); }
function rect(x1, y1, x2, y2) { return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]; }

var doc = app.open(new File(dir + "/source.png"));
var PT = 72 / doc.resolution;

// ---- 1. seamless tile -> pattern -------------------------------------------
doc.selection.select(rect(632, 170, 760, 298));
doc.selection.copy();
doc.selection.deselect();
var tile = app.documents.add(256, 256, doc.resolution, "tile", NewDocumentMode.RGB, DocumentFill.WHITE);
function pasteAt(x, y, flipH, flipV) {
    var l = tile.paste();
    if (flipH || flipV) l.resize(flipH ? -100 : 100, flipV ? -100 : 100, AnchorPosition.MIDDLECENTER);
    var b = l.bounds;
    l.translate(x - b[0].as("px"), y - b[1].as("px"));
}
pasteAt(0, 0, false, false);
pasteAt(128, 0, true, false);
pasteAt(0, 128, false, true);
pasteAt(128, 128, true, true);
tile.flatten();
tile.selection.selectAll();
(function () {
    var r = new ActionReference(); r.putClass(cID("Ptrn"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var u = new ActionReference();
    u.putProperty(cID("Prpr"), cID("fsel"));
    u.putEnumerated(cID("Dcmn"), cID("Ordn"), cID("Trgt"));
    d.putReference(cID("Usng"), u);
    d.putString(cID("Nm  "), PATTERN);
    executeAction(cID("Mk  "), d, DialogModes.NO); // Edit > Define Pattern
})();
tile.close(SaveOptions.DONOTSAVECHANGES);
app.activeDocument = doc;

// ---- 2. Pattern Stamp ------------------------------------------------------
var layer = doc.artLayers.add();
layer.name = "Pattern Stamp - wall pattern";

(function selectTool() {
    var r = new ActionReference(); r.putClass(sID("patternStampTool"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    executeAction(cID("slct"), d, DialogModes.NO);
})();

(function setToolOptions() {
    var r = new ActionReference(); r.putClass(sID("patternStampTool"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var o = new ActionDescriptor();
    var p = new ActionDescriptor(); p.putString(cID("Nm  "), PATTERN);
    o.putObject(cID("Ptrn"), cID("Ptrn"), p);
    o.putBoolean(cID("Algn"), true);            // Aligned
    o.putBoolean(sID("impressionist"), false);
    o.putUnitDouble(cID("Opct"), cID("#Prc"), 100);
    d.putObject(cID("T   "), sID("currentToolOptions"), o);
    executeAction(cID("setd"), d, DialogModes.NO);
})();

(function setBrush() {
    var r = new ActionReference(); r.putEnumerated(cID("Brsh"), cID("Ordn"), cID("Trgt"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var b = new ActionDescriptor();
    b.putUnitDouble(sID("masterDiameter"), cID("#Pxl"), 90);
    b.putUnitDouble(cID("Hrdn"), cID("#Prc"), 100);
    b.putUnitDouble(cID("Spcn"), cID("#Prc"), 10);
    d.putObject(cID("T   "), cID("Brsh"), b);
    try { executeAction(cID("setd"), d, DialogModes.NO); } catch (e) {}
})();

function strokePatternStamp(points) {
    var pts = [];
    for (var i = 0; i < points.length; i++) {
        var q = new PathPointInfo(), a = [points[i][0] * PT, points[i][1] * PT];
        q.kind = PointKind.CORNERPOINT; q.anchor = a; q.leftDirection = a; q.rightDirection = a;
        pts.push(q);
    }
    var sp = new SubPathInfo();
    sp.operation = ShapeOperation.SHAPEADD; sp.closed = false; sp.entireSubPath = pts;
    var path = doc.pathItems.add("stampStroke", [sp]);
    var r = new ActionReference(); r.putName(cID("Path"), "stampStroke");
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    d.putClass(cID("Usng"), sID("patternStampTool"));
    d.putBoolean(cID("Prs "), false);
    executeAction(cID("Strk"), d, DialogModes.NO);
    path.remove();
}

// Selection keeps the strokes inside the marked area; the brush runs past it.
doc.activeLayer = layer;
doc.selection.select(rect(BOX[0], BOX[1], BOX[2], BOX[3]));
var pts = [], row = 0;
for (var y = BOX[1] + 10; y <= BOX[3] + 30; y += 40, row++) {
    if (row % 2 == 0) { pts.push([BOX[0] - 30, y]); pts.push([BOX[2] + 30, y]); }
    else { pts.push([BOX[2] + 30, y]); pts.push([BOX[0] - 30, y]); }
}
strokePatternStamp(pts);
doc.selection.deselect();

// ---- 3. leaves in front, room lighting -------------------------------------
function pasteFile(name) {
    var src = app.open(new File(dir + "/" + name));
    src.selection.selectAll(); src.selection.copy();
    src.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;
}

// Layer mask from mask.png (white = pattern, black = leaves): paste it on
// top, load its brightness as a selection, then mask the pattern layer.
pasteFile("mask.png");
var tmp = doc.paste();
(function loadLuminosity() {
    var r = new ActionReference(); r.putProperty(cID("Chnl"), cID("fsel"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var t = new ActionReference(); t.putEnumerated(cID("Chnl"), cID("Chnl"), cID("RGB "));
    d.putReference(cID("T   "), t);
    executeAction(cID("setd"), d, DialogModes.NO);
})();
tmp.remove();
doc.activeLayer = layer;
(function addMaskFromSelection() {
    var d = new ActionDescriptor();
    d.putClass(cID("Nw  "), cID("Chnl"));
    var r = new ActionReference(); r.putEnumerated(cID("Chnl"), cID("Chnl"), cID("Msk "));
    d.putReference(cID("At  "), r);
    d.putEnumerated(cID("Usng"), cID("UsrM"), cID("RvlS"));
    executeAction(cID("Mk  "), d, DialogModes.NO);
})();
doc.selection.deselect();

// Lighting: mid-grey = no change; Linear Light adds (grey - 128) * 2.
pasteFile("lighting.png");
var light = doc.paste();
light.name = "Wall lighting (Linear Light)";
light.blendMode = BlendMode.LINEARLIGHT;
light.grouped = true; // clip to the pattern layer

var psd = new PhotoshopSaveOptions(); psd.layers = true; psd.embedColorProfile = true;
doc.saveAs(new File(dir + "/wall-pattern.psd"), psd, true);
doc.saveAs(new File(dir + "/preview.png"), new PNGSaveOptions(), true);
var names = [];
for (var i = 0; i < doc.layers.length; i++) names.push(doc.layers[i].name);
doc.close(SaveOptions.DONOTSAVECHANGES);
names.join(" | ");
