import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// This label is set by our translation override, not a generated CSS class.
export const PUBLICATION_TABS_LABEL = 'Entry publication views';

/** Keep bookmarks and list links on the editable document, including on mobile. */
export function SingleEditor() {
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('status') !== 'published') return;
    query.set('status', 'draft');
    navigate({ pathname: location.pathname, search: query.toString(), hash: location.hash }, {
      replace: true,
      state: location.state,
    });
  }, [location, navigate]);

  // Strapi 5.52 has no API for removing these two tabs. Scope the override to
  // their accessible label so relation, component and other tabs stay intact.
  return <style>{`[role="tablist"][aria-label="${PUBLICATION_TABS_LABEL}"] { display: none; }`}</style>;
}
