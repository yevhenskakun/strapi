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

// Create content type  with localizations enabled, manually fill database with data, and test the query
describe('Document id migration', () => {
  const builder = createTestBuilder();
  let rq;
  let strapi: LoadedStrapi;
  let localeService;
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
      { name: 'Cat-4-Es', locale: 'es' }, // Not default - one other locale
      { name: 'Cat-4-Fr', locale: 'fr' }, // Not default - one other locale
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
  });

  afterAll(async () => {
    await localeService.setDefaultLocale({ code: 'en' });
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Migrate document ids', () => {
    it('Multiple localizations', async () => {});
    it('No localizations - default locale', async () => {});
    it('No localizations - non-default locale', async () => {});
  });
});
