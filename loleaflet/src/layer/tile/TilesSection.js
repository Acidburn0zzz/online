/* eslint-disable */
/* See CanvasSectionContainer.ts for explanations. */
var TilesSection = /** @class */ (function () {
    function TilesSection() {
        this.context = null;
        this.myTopLeft = null;
        this.documentTopLeft = null;
        this.containerObject = null;
        this.dpiScale = null;
        this.name = null;
        this.backgroundColor = null;
        this.borderColor = null;
        this.boundToSection = null;
        this.anchor = new Array(0);
        this.position = new Array(0);
        this.size = new Array(0);
        this.expand = new Array(0);
        this.isLocated = false;
        this.processingOrder = null;
        this.drawingOrder = null;
        this.zIndex = null;
        this.interactable = false;
        this.sectionProperties = {};
        this.offscreenCanvases = new Array(0);
        this.oscCtxs = new Array(0);
        this.name = L.CSections.Tiles.name;
        this.anchor = ['top', 'left'];
        this.position = [200, 200]; // This will be adjusted in "onInitialize" according to dpiScale.
        this.size = [0, 0]; // Going to be expanded, no initial width or height is necessary.
        this.expand = ['top', 'left', 'bottom', 'right'];
        this.processingOrder = L.CSections.Tiles.processingOrder;
        this.drawingOrder = L.CSections.Tiles.drawingOrder;
        this.zIndex = L.CSections.Tiles.zIndex;
        this.map = L.Map.THIS;
        this.sectionProperties.docLayer = this.map._docLayer;
        this.sectionProperties.tsManager = this.sectionProperties.docLayer._painter;
    }
    TilesSection.prototype.onInitialize = function () {
        this.position = [Math.round(200 * this.dpiScale), Math.round(200 * this.dpiScale)]; // Set its initial position to somewhere blank. Other sections shouldn't cover this point after initializing.
        for (var i = 0; i < 4; i++) {
            this.offscreenCanvases.push(document.createElement('canvas'));
            this.oscCtxs.push(this.offscreenCanvases[i].getContext('2d', { alpha: false }));
        }
        this.onResize();
    };
    TilesSection.prototype.onResize = function () {
        var tileSize = this.sectionProperties.docLayer._getTileSize();
        var borderSize = 3;
        this.sectionProperties.osCanvasExtraSize = 2 * borderSize * tileSize;
        for (var i = 0; i < 4; ++i) {
            this.offscreenCanvases[i].width = this.size[0] + this.sectionProperties.osCanvasExtraSize;
            this.offscreenCanvases[i].height = this.size[1] + this.sectionProperties.osCanvasExtraSize;
        }
    };
    TilesSection.prototype.extendedPaneBounds = function (paneBounds) {
        var extendedBounds = paneBounds.clone();
        var halfExtraSize = this.sectionProperties.osCanvasExtraSize / 2; // This is always an integer.
        if (this.sectionProperties.docLayer.getSplitPanesContext()) {
            if (paneBounds.min.x) { // pane can move in x direction.
                extendedBounds.min.x = Math.max(0, extendedBounds.min.x - halfExtraSize);
                extendedBounds.max.x += halfExtraSize;
            }
            if (paneBounds.min.y) { // pane can move in y direction.
                extendedBounds.min.y = Math.max(0, extendedBounds.min.y - halfExtraSize);
                extendedBounds.max.y += halfExtraSize;
            }
        }
        else {
            extendedBounds.min.x -= halfExtraSize;
            extendedBounds.max.x += halfExtraSize;
            extendedBounds.min.y -= halfExtraSize;
            extendedBounds.max.y += halfExtraSize;
        }
        return extendedBounds;
    };
    TilesSection.prototype.paintWithPanes = function (tile, ctx) {
        var tileTopLeft = tile.coords.getPos();
        var tileBounds = new L.Bounds(tileTopLeft, tileTopLeft.add(ctx.tileSize));
        for (var i = 0; i < ctx.paneBoundsList.length; ++i) {
            // co-ordinates of this pane in core document pixels
            var paneBounds = ctx.paneBoundsList[i];
            // co-ordinates of the main-(bottom right) pane in core document pixels
            var viewBounds = ctx.viewBounds;
            // Extended pane bounds
            var extendedBounds = this.extendedPaneBounds(paneBounds);
            // into real pixel-land ...
            paneBounds.round();
            viewBounds.round();
            extendedBounds.round();
            if (paneBounds.intersects(tileBounds)) {
                var paneOffset = paneBounds.getTopLeft(); // allocates
                // Cute way to detect the in-canvas pixel offset of each pane
                paneOffset.x = Math.min(paneOffset.x, viewBounds.min.x);
                paneOffset.y = Math.min(paneOffset.y, viewBounds.min.y);
                this.drawTileInPane(tile, tileBounds, paneBounds, paneOffset, this.context);
            }
            if (extendedBounds.intersects(tileBounds)) {
                var offset = extendedBounds.getTopLeft();
                offset.x = Math.min(offset.x, viewBounds.min.x);
                offset.y = Math.min(offset.y, viewBounds.min.y);
                this.drawTileInPane(tile, tileBounds, extendedBounds, offset, this.oscCtxs[i]);
            }
        }
    };
    TilesSection.prototype.drawTileInPane = function (tile, tileBounds, paneBounds, paneOffset, canvasCtx) {
        // intersect - to avoid state thrash through clipping
        var crop = new L.Bounds(tileBounds.min, tileBounds.max);
        crop.min.x = Math.max(paneBounds.min.x, tileBounds.min.x);
        crop.min.y = Math.max(paneBounds.min.y, tileBounds.min.y);
        crop.max.x = Math.min(paneBounds.max.x, tileBounds.max.x);
        crop.max.y = Math.min(paneBounds.max.y, tileBounds.max.y);
        var cropWidth = crop.max.x - crop.min.x;
        var cropHeight = crop.max.y - crop.min.y;
        if (cropWidth && cropHeight) {
            canvasCtx.drawImage(tile.el, crop.min.x - tileBounds.min.x, crop.min.y - tileBounds.min.y, cropWidth, cropHeight, crop.min.x - paneOffset.x, crop.min.y - paneOffset.y, cropWidth, cropHeight);
        }
        if (this.sectionProperties.docLayer._debug) {
            canvasCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            canvasCtx.strokeRect(tile.coords.x - paneBounds.min.x, tile.coords.y - paneBounds.min.y, 256, 256);
        }
    };
    TilesSection.prototype.paintSimple = function (tile, ctx) {
        ctx.viewBounds.round();
        var offset = new L.Point(tile.coords.getPos().x - ctx.viewBounds.min.x, tile.coords.getPos().y - ctx.viewBounds.min.y);
        var halfExtraSize = this.sectionProperties.osCanvasExtraSize / 2;
        var extendedOffset = offset.add(new L.Point(halfExtraSize, halfExtraSize));
        this.context.drawImage(tile.el, offset.x, offset.y, ctx.tileSize.x, ctx.tileSize.y);
        this.oscCtxs[0].drawImage(tile.el, extendedOffset.x, extendedOffset.y, ctx.tileSize.x, ctx.tileSize.y);
    };
    TilesSection.prototype.paint = function (tile, ctx) {
        if (!ctx)
            ctx = this.sectionProperties.tsManager._paintContext();
        this.containerObject.setPenPosition(this);
        if (ctx.paneBoundsActive === true)
            this.paintWithPanes(tile, ctx);
        else
            this.paintSimple(tile, ctx);
    };
    TilesSection.prototype.onDraw = function () {
        var zoom = Math.round(this.map.getZoom());
        var part = this.sectionProperties.docLayer._selectedPart;
        // Calculate all this here intead of doing it per tile.
        var ctx = this.sectionProperties.tsManager._paintContext();
        for (var i = 0; i < ctx.paneBoundsList.length; ++i) {
            this.oscCtxs[i].fillStyle = 'white';
            this.oscCtxs[i].fillRect(0, 0, this.offscreenCanvases[i].width, this.offscreenCanvases[i].height);
        }
        var tileRanges = ctx.paneBoundsList.map(this.sectionProperties.docLayer._pxBoundsToTileRange, this.sectionProperties.docLayer);
        for (var rangeIdx = 0; rangeIdx < tileRanges.length; ++rangeIdx) {
            var tileRange = tileRanges[rangeIdx];
            for (var j = tileRange.min.y; j <= tileRange.max.y; ++j) {
                for (var i = tileRange.min.x; i <= tileRange.max.x; ++i) {
                    var coords = new L.TileCoordData(i * ctx.tileSize.x, j * ctx.tileSize.y, zoom, part);
                    var key = coords.key();
                    var tile = this.sectionProperties.docLayer._tiles[key];
                    if (tile && tile.loaded) {
                        this.paint(tile, ctx);
                    }
                }
            }
        }
    };
    TilesSection.prototype.onMouseMove = function () { };
    TilesSection.prototype.onMouseDown = function () { };
    TilesSection.prototype.onMouseUp = function () { };
    TilesSection.prototype.onMouseEnter = function () { };
    TilesSection.prototype.onMouseLeave = function () { };
    TilesSection.prototype.onClick = function () { };
    TilesSection.prototype.onDoubleClick = function () { };
    TilesSection.prototype.onContextMenu = function () { };
    TilesSection.prototype.onMouseWheel = function () { };
    TilesSection.prototype.onLongPress = function () { };
    TilesSection.prototype.onMultiTouchStart = function () { };
    TilesSection.prototype.onMultiTouchMove = function () { };
    TilesSection.prototype.onMultiTouchEnd = function () { };
    TilesSection.prototype.onNewDocumentTopLeft = function () { };
    return TilesSection;
}());
L.getNewTilesSection = function () {
    return new TilesSection();
};
