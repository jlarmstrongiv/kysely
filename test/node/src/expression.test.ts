import {
  DIALECTS,
  clearDatabase,
  destroyTest,
  initTest,
  insertDefaultDataSet,
  TestContext,
  testSql,
} from './test-setup.js'

for (const dialect of DIALECTS) {
  describe(`${dialect}: expressions`, () => {
    let ctx: TestContext

    before(async function () {
      ctx = await initTest(this, dialect)
    })

    beforeEach(async () => {
      await insertDefaultDataSet(ctx)
    })

    afterEach(async () => {
      await clearDatabase(ctx)
    })

    after(async () => {
      await destroyTest(ctx)
    })

    it('expression kitchen sink', async () => {
      const query = ctx.db
        .selectFrom('person')
        .selectAll('person')
        .where(
          ({ and, or, eb, fn, exists, not, ref, val, selectFrom, parens }) =>
            and([
              or([
                not(eb('first_name', '=', 'Jennifer')),
                eb(eb('id', '+', 1), '>', 10),
                eb(ref('id'), 'in', val([10, 20, 30])),
                or([eb(fn('upper', ['first_name']), '=', 'SYLVESTER')]),
                // Empty or
                or([]),
              ]),
              exists(
                selectFrom('pet')
                  .select('pet.id')
                  .whereRef('pet.owner_id', '=', 'person.id')
              ),
              // Empty and
              and([]),
              eb('id', '=', 1)
                .or('id', '=', 2)
                .or('id', '=', 3)
                .or(eb('id', '=', 4)),
              eb('id', '=', 1)
                .and('first_name', '=', 'Jennifer')
                .and('last_name', '=', 'Aniston')
                .and(eb('marital_status', '=', 'divorced')),
              // Should not produce double parens
              parens(eb('id', '=', 1).or('id', '=', 2)),
              eb(parens('id', '+', 1), '>', 10),
            ])
        )

      testSql(query, dialect, {
        postgres: {
          sql: 'select "person".* from "person" where ((not "first_name" = $1 or "id" + $2 > $3 or "id" in ($4, $5, $6) or upper("first_name") = $7 or false) and exists (select "pet"."id" from "pet" where "pet"."owner_id" = "person"."id") and true and ("id" = $8 or "id" = $9 or "id" = $10 or "id" = $11) and ("id" = $12 and "first_name" = $13 and "last_name" = $14 and "marital_status" = $15) and ("id" = $16 or "id" = $17) and ("id" + $18) > $19)',
          parameters: [
            'Jennifer',
            1,
            10,
            10,
            20,
            30,
            'SYLVESTER',
            1,
            2,
            3,
            4,
            1,
            'Jennifer',
            'Aniston',
            'divorced',
            1,
            2,
            1,
            10,
          ],
        },
        mysql: {
          sql: 'select `person`.* from `person` where ((not `first_name` = ? or `id` + ? > ? or `id` in (?, ?, ?) or upper(`first_name`) = ? or false) and exists (select `pet`.`id` from `pet` where `pet`.`owner_id` = `person`.`id`) and true and (`id` = ? or `id` = ? or `id` = ? or `id` = ?) and (`id` = ? and `first_name` = ? and `last_name` = ? and `marital_status` = ?) and (`id` = ? or `id` = ?) and (`id` + ?) > ?)',
          parameters: [
            'Jennifer',
            1,
            10,
            10,
            20,
            30,
            'SYLVESTER',
            1,
            2,
            3,
            4,
            1,
            'Jennifer',
            'Aniston',
            'divorced',
            1,
            2,
            1,
            10,
          ],
        },
        sqlite: {
          sql: 'select "person".* from "person" where ((not "first_name" = ? or "id" + ? > ? or "id" in (?, ?, ?) or upper("first_name") = ? or false) and exists (select "pet"."id" from "pet" where "pet"."owner_id" = "person"."id") and true and ("id" = ? or "id" = ? or "id" = ? or "id" = ?) and ("id" = ? and "first_name" = ? and "last_name" = ? and "marital_status" = ?) and ("id" = ? or "id" = ?) and ("id" + ?) > ?)',
          parameters: [
            'Jennifer',
            1,
            10,
            10,
            20,
            30,
            'SYLVESTER',
            1,
            2,
            3,
            4,
            1,
            'Jennifer',
            'Aniston',
            'divorced',
            1,
            2,
            1,
            10,
          ],
        },
      })

      await query.execute()
    })
  })
}
