export default function TreeHeadingCenter() {
  return <style>{`
    .content-heading:has(+ .tree-viewport) {
      align-items: center !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }

    .content-heading:has(+ .tree-viewport) > div:first-child {
      align-self: stretch !important;
      display: flex !important;
      align-items: center !important;
      min-width: 0;
    }

    .content-heading:has(+ .tree-viewport) h2 {
      margin: 0 !important;
      line-height: 1.08 !important;
      display: flex !important;
      align-items: center !important;
      min-height: 100%;
    }

    .content-heading:has(+ .tree-viewport) .mobile-generation-control,
    .content-heading:has(+ .tree-viewport) .view-chip {
      align-self: center !important;
    }

    @media (max-width: 740px) {
      .content-heading:has(+ .tree-viewport) {
        height: 78px !important;
        min-height: 78px !important;
      }
    }

    .mode-mobile .content-heading:has(+ .tree-viewport) {
      height: 78px !important;
      min-height: 78px !important;
      align-items: center !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }
  `}</style>;
}
