import type { PanelComponent, PanelComponentProps } from '@strapi/content-manager/strapi-admin';
import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/content-manager/strapi-admin';
import { Flex, Typography } from '@strapi/design-system';

function authorIdentity(value: unknown) {
  const author = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const text = (field: string) => typeof author[field] === 'string' ? author[field].trim() : '';
  return {
    name: [text('firstname'), text('lastname')].filter(Boolean).join(' '),
    username: text('username'),
    email: text('email'),
  };
}

function AuthorIdentity({ value }: { value: unknown }) {
  const { name, username, email } = authorIdentity(value);
  return <Flex direction="column" alignItems="flex-start" gap={1}>
    {name && <Typography variant="pi" textColor="neutral800">{name}</Typography>}
    {username && <Typography variant="pi" textColor="neutral600">Username: {username}</Typography>}
    {email && <Typography variant="pi" textColor="neutral600" style={{ overflowWrap: 'anywhere' }}>{email}</Typography>}
    {!name && !username && !email && <Typography variant="pi" textColor="neutral600">Not recorded</Typography>}
  </Flex>;
}

function dateLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function Information({ document, meta, activeTab }: PanelComponentProps) {
  const { hasDraftAndPublish } = useContentManagerContext();
  // Creation/update belong to the editable record; publication belongs to the
  // published record. This matches Strapi's own document information menu.
  const draft = activeTab === 'published'
    ? meta?.availableStatus?.find((entry) => entry.publishedAt === null)
    : document;
  const published = activeTab === 'published'
    ? document
    : meta?.availableStatus?.find((entry) => entry.publishedAt != null);
  const details = [
    { label: 'Created by', dateName: 'Created on', date: draft?.createdAt, author: draft?.createdBy },
    { label: 'Last updated by', dateName: 'Updated on', date: draft?.updatedAt, author: draft?.updatedBy },
    { label: 'Published by', dateName: 'Published on', date: published?.publishedAt, author: published?.publishedBy },
  ].filter(({ date }) => dateLabel(date));

  return <Flex direction="column" alignItems="stretch" gap={4} width="100%">
    {hasDraftAndPublish && <Typography variant="pi" textColor="neutral600">
      Save keeps your changes in the CMS. Publish updates the website.
    </Typography>}
    {details.length > 0 && <Flex tag="dl" direction="column" alignItems="stretch" gap={3}>
      {details.map(({ label, dateName, date, author }) => <Flex key={label} direction="column" alignItems="flex-start" gap={1}>
        <Typography tag="dt" variant="pi" fontWeight="bold">{label}</Typography>
        <Flex tag="dd" direction="column" alignItems="stretch" gap={1} width="100%">
          <AuthorIdentity value={author} />
          <Typography variant="pi" textColor="neutral600">
            {dateName}: <time dateTime={date}>{dateLabel(date)}</time>
          </Typography>
        </Flex>
      </Flex>)}
    </Flex>}
  </Flex>;
}

export const EntryInformation: PanelComponent = (props) => ({
  title: 'Entry information',
  content: <Information {...props} />,
});
