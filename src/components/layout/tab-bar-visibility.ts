/** Detail, cart and checkout have their own bottom area in the layout (buy bar, summary sheet, confirm), with no tab bar. */
export const hasTabBar = (pathname: string) => !/^\/(nfts|cart|checkout)(\/|$)/.test(pathname)
