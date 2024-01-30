import { LoadedStrapi } from '@strapi/types';
import localizations from '../../../../../packages/plugins/i18n/server/src/services/localizations';
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

const CATEGORY_UID = 'api::category.category';
const CATEGORY = {
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
    },
  },
  uid: CATEGORY_UID,
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  description: '',
  collectionName: '',
};

const sql = String.raw;

const migrateFromLocale = async (strapi: LoadedStrapi, locale: string) => {
  // Can we make this query a bit simpler, and also make it work for mysql/postgres?
  await strapi.db.queryBuilder(CATEGORY_UID).raw(sql`
      -- Temp table of id/document_id pairs for all categories that have localizations
      WITH CategoryUpdates AS (
          SELECT
              cat_locale.id AS locale_id,
              'doc-' || cat.id AS new_document_id
          FROM
            categories AS cat
            -- Join by the localizations table
            JOIN categories_localizations_links AS cat_join ON cat_join.category_id = cat.id
            JOIN categories AS cat_locale ON cat_locale.id = cat_join.inv_category_id
          WHERE
            cat.locale = '${locale}' AND
            -- Ignore already migrated categories
            cat.document_id IS NULL
      )
      -- Update the categories table with the new document ids
      UPDATE categories
      SET document_id = (
          SELECT new_document_id
          FROM CategoryUpdates
          WHERE categories.id = CategoryUpdates.locale_id
      )
      WHERE id IN (
          SELECT locale_id
          FROM CategoryUpdates
      )
  `);

  // Now update the locale document id

  await strapi.db.queryBuilder(CATEGORY_UID).raw(sql`
    UPDATE categories
    SET
      document_id = 'doc-' || id
    WHERE
      locale = '${locale}' AND
      -- Ignore already migrated categories
      document_id IS NULL
  `);
};

// Create content type  with localizations enabled, manually fill database with data, and test the query
describe('Document id migration', () => {
  const builder = createTestBuilder();
  let rq;
  let strapi: LoadedStrapi;
  let categoriesId = {};

  beforeAll(async () => {
    await builder
      .addContentTypes([CATEGORY])
      .addFixtures('plugin::i18n.locale', [
        { name: 'Es', code: 'es' },
        { name: 'Fr', code: 'fr' },
      ])
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    const query = strapi.db.query(CATEGORY_UID);
    // Create categories like they would be created in v4.
    const categories = [
      { name: 'Cat-1-En', locale: 'en' }, // Multiple localizations
      { name: 'Cat-1-Fr', locale: 'fr' }, // Multiple localizations
      { name: 'Cat-1-Es', locale: 'es' }, // Multiple localizations
      { name: 'Cat-2-En', locale: 'en' }, // No localizations - default locale
      { name: 'Cat-3-Es', locale: 'es' }, // No localizations - non-default locale
      { name: 'Cat-4-Fr', locale: 'fr' }, // Not default - one other locale
      { name: 'Cat-4-Es', locale: 'es' }, // Not default - one other locale
    ];
    const result = await query.createMany({ data: categories });

    categoriesId = categories.reduce((acc, { name }, idx) => {
      acc[name] = result.ids[idx];
      return acc;
    }, {});

    // Connect localizations to every category
    await Promise.all([
      // Multiple localizations
      query.update({
        where: { id: categoriesId['Cat-1-En'] },
        data: { localizations: [categoriesId['Cat-1-Fr'], categoriesId['Cat-1-Es']] },
      }),
      query.update({
        where: { id: categoriesId['Cat-1-Fr'] },
        data: { localizations: [categoriesId['Cat-1-En'], categoriesId['Cat-1-Es']] },
      }),
      query.update({
        where: { id: categoriesId['Cat-1-Es'] },
        data: { localizations: [categoriesId['Cat-1-En'], categoriesId['Cat-1-Fr']] },
      }),

      // No localizations - default locale
      query.update({
        where: { id: categoriesId['Cat-2-En'] },
        data: { localizations: [] },
      }),
      query.update({
        where: { id: categoriesId['Cat-3-Es'] },
        data: { localizations: [] },
      }),

      // Not default - one other locale
      query.update({
        where: { id: categoriesId['Cat-4-Es'] },
        data: { localizations: [categoriesId['Cat-4-Fr']] },
      }),
      query.update({
        where: { id: categoriesId['Cat-4-Fr'] },
        data: { localizations: [categoriesId['Cat-4-Es']] },
      }),
    ]);

    // Empty all document id columns, same as they would be migrating from v4 to v5
    await strapi.db.query(CATEGORY_UID).updateMany({
      where: {},
      data: { documentId: null },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('Migrate document ids', async () => {
    await migrateFromLocale(strapi, 'en');
    await migrateFromLocale(strapi, 'fr');
    await migrateFromLocale(strapi, 'es');

    const new_categories = await strapi.db
      .query(CATEGORY_UID)
      .findMany({ select: ['name', 'documentId'] });

    expect(new_categories).toEqual(
      expect.arrayContaining([
        { name: 'Cat-1-En', documentId: 'doc-1' },
        { name: 'Cat-1-Fr', documentId: 'doc-1' },
        { name: 'Cat-1-Es', documentId: 'doc-1' },
        { name: 'Cat-2-En', documentId: 'doc-4' },
        { name: 'Cat-3-Es', documentId: 'doc-5' },
        { name: 'Cat-4-Es', documentId: 'doc-6' },
        { name: 'Cat-4-Fr', documentId: 'doc-6' },
      ])
    );
  });
});
