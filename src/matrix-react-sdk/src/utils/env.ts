const ua = navigator.userAgent;

export const isDev = process.env.NODE_ENV === "development";
export const isInDesktop = ua.toLocaleLowerCase().includes("heliumos"); // 是否是在桌面端
