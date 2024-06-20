export function download(src: string, name?: string) {
    const a = document.createElement("a");
    a.href = src;
    if (name) a.download = name;
    a.target = "_blank";
    a.rel = "noreferrer noopener";
    a.click();
}
