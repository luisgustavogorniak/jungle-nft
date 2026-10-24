/** Detail and cart have their own bottom area in the layout (buy bar, summary sheet), with no tab bar. */
export const hasTabBar = (pathname: string) => !/^\/(nfts|cart)(\/|$)/.test(pathname)
