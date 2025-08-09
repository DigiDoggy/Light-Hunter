export default class Flashlight {
    constructor() {
        this.flashlightOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.flashlightOverlay.setAttribute("width", "100%");
        this.flashlightOverlay.setAttribute("height", "100%");
        this.flashlightOverlay.style.position = "absolute";
        this.flashlightOverlay.style.top = "0";
        this.flashlightOverlay.style.left = "0";
        this.flashlightOverlay.style.pointerEvents = "none";
        this.flashlightOverlay.style.zIndex = "100";
        this.flashlightOverlay.innerHTML = `
          <defs>
              <filter id="blur-filter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="15" />
              </filter>
              <mask id="flashlight-mask">
                <rect width="100%" height="100%" fill="white"/>
              </mask>
          </defs>
          <rect width="100%" height="100%" fill="black" mask="url(#flashlight-mask)" />`;
        this.mask = this.flashlightOverlay.querySelector("#flashlight-mask");
    }

    clearCones() {
        this.mask.querySelectorAll("polygon").forEach(p => p.remove());
    }

    addCone(points) {
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", points);
        polygon.setAttribute("opacity", "0.8");
        polygon.setAttribute("fill", "black");
        polygon.setAttribute("filter", "url(#blur-filter)");
        this.mask.appendChild(polygon);
    }
}