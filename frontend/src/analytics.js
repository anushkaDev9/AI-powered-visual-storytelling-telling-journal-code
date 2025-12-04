import ReactGA from "react-ga4";

export const initGA = () => {
    ReactGA.initialize("G-4T4JT5XFMY"); // your ID
};

export const trackPage = (page) => {
    ReactGA.send({ hitType: "pageview", page });
};

export const trackEvent = (name, params = {}) => {
    ReactGA.event(name, params);
};
