/** Login and register are full pages with their own layout (M5/M6). Detail, cart and checkout have their own bottom area in the layout (buy bar, summary sheet, confirm), with no tab bar. */
export const hasTabBar = (pathname: string) => !/^\/(nfts|cart|checkout|login|register)(\/|$)/.test(pathname)
