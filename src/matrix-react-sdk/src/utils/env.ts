const ua = navigator.userAgent;

export const isInDesktop = ua.toLocaleLowerCase().includes("heliumos"); // 是否是在桌面端
