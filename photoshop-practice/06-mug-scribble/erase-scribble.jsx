// Removes the blue scribbles with the Eraser tool, leaving the mug untouched.
//  1. "Clean plate": a copy of the photo with the scribbles filled in from
//     the surrounding wall and marble (Content-Aware Fill).
//  2. "Photo (erased)": the untouched photo on top. Eraser strokes remove
//     the scribbles from it, revealing the clean plate underneath. A
//     selection of the scribbles (minus the mug) keeps the eraser off
//     everything else.
#target photoshop
app.displayDialogs = DialogModes.NO;
app.preferences.rulerUnits = Units.PIXELS;

var dir = "/Users/sowmi-zstch1630/Pictures/ps-scribble";
function cID(s) { return charIDToTypeID(s); }
function sID(s) { return stringIDToTypeID(s); }

var doc = app.open(new File(dir + "/source.png"));
var PT = 72 / doc.resolution;
var bg = doc.layers[doc.layers.length - 1];

// Load a black/white mask image as the active selection (white = selected).
function selectFromMask(name) {
    var src = app.open(new File(dir + "/" + name));
    src.selection.selectAll(); src.selection.copy();
    src.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;
    var keep = doc.activeLayer;
    var tmp = doc.paste();
    var r = new ActionReference(); r.putProperty(cID("Chnl"), cID("fsel"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var t = new ActionReference(); t.putEnumerated(cID("Chnl"), cID("Chnl"), cID("RGB "));
    d.putReference(cID("T   "), t);
    executeAction(cID("setd"), d, DialogModes.NO);
    tmp.remove();
    doc.activeLayer = keep;
}

// ---- 1. clean plate ---------------------------------------------------------
var plate = bg.duplicate();
plate.name = "Clean plate";
doc.activeLayer = plate;
// Clear the mug from the clean plate so Content-Aware Fill can't borrow its
// texture for the marble; the mug itself shows from the photo layer on top.
var MUG = [[172, 318], [200, 302], [370, 295], [540, 301], [579, 318], [582, 372], [615, 368], [665, 378], [705, 405], [724, 455], [722, 525], [704, 585], [668, 640], [625, 684], [598, 708], [582, 722], [576, 762], [560, 800], [530, 826], [470, 837], [300, 838], [232, 828], [198, 806], [178, 770], [172, 700]];
doc.selection.select(MUG);
doc.selection.clear();
selectFromMask("fill-mask.png");
(function contentAwareFill() {
    var d = new ActionDescriptor();
    d.putEnumerated(cID("Usng"), cID("FlCn"), sID("contentAware"));
    d.putBoolean(sID("contentAwareColorAdaptationFill"), true);
    d.putUnitDouble(cID("Opct"), cID("#Prc"), 100);
    d.putEnumerated(cID("Md  "), cID("BlnM"), cID("Nrml"));
    executeAction(cID("Fl  "), d, DialogModes.NO);
})();
doc.selection.deselect();

// ---- 2. the photo on top, erased with the Eraser tool -----------------------
var photo = bg.duplicate();
photo.move(plate, ElementPlacement.PLACEBEFORE);
photo.name = "Photo (scribbles erased)";
doc.activeLayer = photo;

(function selectEraser() {
    var r = new ActionReference(); r.putClass(sID("eraserTool"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    executeAction(cID("slct"), d, DialogModes.NO);
})();
(function setBrush() {
    var r = new ActionReference(); r.putEnumerated(cID("Brsh"), cID("Ordn"), cID("Trgt"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var b = new ActionDescriptor();
    b.putUnitDouble(sID("masterDiameter"), cID("#Pxl"), 24);
    b.putUnitDouble(cID("Hrdn"), cID("#Prc"), 70);
    b.putUnitDouble(cID("Spcn"), cID("#Prc"), 10);
    d.putObject(cID("T   "), cID("Brsh"), b);
    try { executeAction(cID("setd"), d, DialogModes.NO); } catch (e) {}
})();

function eraserStroke(points) {
    var pts = [];
    for (var i = 0; i < points.length; i++) {
        var q = new PathPointInfo(), a = [points[i][0] * PT, points[i][1] * PT];
        q.kind = PointKind.CORNERPOINT; q.anchor = a; q.leftDirection = a; q.rightDirection = a;
        pts.push(q);
    }
    var sp = new SubPathInfo();
    sp.operation = ShapeOperation.SHAPEADD; sp.closed = false; sp.entireSubPath = pts;
    var path = doc.pathItems.add("eraserStroke", [sp]);
    var r = new ActionReference(); r.putName(cID("Path"), "eraserStroke");
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    d.putClass(cID("Usng"), sID("eraserTool"));
    d.putBoolean(cID("Prs "), false);
    executeAction(cID("Strk"), d, DialogModes.NO);
    path.remove();
}

// Brush back and forth over each scribble's area; the selection limits the
// eraser to the scribble lines (plus a few px), never the mug.
var areas = [
    [20, 45, 385, 305],   // top left
    [545, 60, 710, 240],  // star
    [18, 370, 155, 550],  // left, upper
    [18, 550, 160, 830],  // left, lower
    [35, 840, 355, 1035], // bottom left
    [335, 645, 740, 1050] // bottom right
];
selectFromMask("erase-mask.png");
for (var i = 0; i < areas.length; i++) {
    var A = areas[i], pts = [], row = 0;
    for (var y = A[1]; y <= A[3]; y += 10, row++) {
        if (row % 2 == 0) { pts.push([A[0], y]); pts.push([A[2], y]); }
        else { pts.push([A[2], y]); pts.push([A[0], y]); }
    }
    eraserStroke(pts);
}
doc.selection.deselect();

var psd = new PhotoshopSaveOptions(); psd.layers = true; psd.embedColorProfile = true;
doc.saveAs(new File(dir + "/mug-scribble-removed.psd"), psd, true);
doc.saveAs(new File(dir + "/preview.png"), new PNGSaveOptions(), true);
var names = [];
for (var i = 0; i < doc.layers.length; i++) names.push(doc.layers[i].name);
doc.close(SaveOptions.DONOTSAVECHANGES);
names.join(" | ");
