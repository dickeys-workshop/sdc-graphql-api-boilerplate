/* eslint-disable func-names, dot-notation, no-param-reassign, no-undef  */
import {
  fromGlobalId,
} from 'graphql-relay';
import database from '../database';
import { BaseModel } from './BaseModel';
import { personAddressType } from '../types';
import {
  Person,
  Address,
} from './';

class PersonAddress extends BaseModel {

  sqlJoinRegistry() {
    return {
      creator: (databaseInstance, args, context, parsedAST, tableAlias, parentTableAlias) => {
        this.setQueryDate(databaseInstance, args, context, Person, tableAlias, parentTableAlias);
        databaseInstance.leftJoin(`person as ${tableAlias}`, `${parentTableAlias}.creator_id`, `${tableAlias}.id`);

        return Person.generateSqlJoins(databaseInstance, args, context, parsedAST, tableAlias);
      },
      person: (databaseInstance, args, context, parsedAST, tableAlias, parentTableAlias) => {
        this.setQueryDate(databaseInstance, args, context, Person, tableAlias, parentTableAlias);
        databaseInstance.leftJoin(`person as ${tableAlias}`, `${parentTableAlias}.person_id`, `${tableAlias}.id`);

        return Person.generateSqlJoins(databaseInstance, args, context, parsedAST, tableAlias);
      },
      address: (databaseInstance, args, context, parsedAST, tableAlias, parentTableAlias) => {
        this.setQueryDate(databaseInstance, args, context, Address, tableAlias, parentTableAlias);
        databaseInstance.leftJoin(`address as ${tableAlias}`, `${parentTableAlias}.address_id`, `${tableAlias}.id`);

        return Address.generateSqlJoins(databaseInstance, args, context, parsedAST, tableAlias);
      },
    };
  }

  getAll(args, context, ast) {
    const databaseInstance = this.tableInstance;
    const parsedAST = this.parseAST(ast);
    const filterKeys = this.requestedFilterKeys(args.filter, this.graphQLTypeFields);

    if (filterKeys.has('date')) {
      context.date = filterKeys.get('date')['__eq'];
      databaseInstance.where('person_address.created', '<=', filterKeys.get('date')['__eq']);
      databaseInstance.where('person_address.expired', '>', filterKeys.get('date')['__eq']);
    } else {
      context.date = database.raw('CURRENT_TIMESTAMP(6)');
      databaseInstance.where('person_address.created', '<=', database.raw('CURRENT_TIMESTAMP(6)'));
      databaseInstance.where('person_address.expired', '>', database.raw('CURRENT_TIMESTAMP(6)'));
    }

    if (this.isUserOrGuest(context.request.user.accessLevel)) {
      const personId = fromGlobalId(context.request.user.personId).id.split(':');
      databaseInstance.whereIn('person_address.person_id', personId[0]);
    }

    const sqlAST = this.generateSqlJoins(databaseInstance, args, context, parsedAST);

    return {
      sqlAST,
      countQuery: databaseInstance.clone(),
      availableFilters: this.getAvailableFilters(parsedAST, sqlAST, context),
      availableSorts: this.getAvailableSorts(parsedAST, sqlAST, context),
      dataQuery: (limit, offset) => {
        const connectionQuery = this.generateSqlSelect(databaseInstance, parsedAST, sqlAST, args, context);
        if (connectionQuery) {
          connectionQuery
            .limit(limit)
            .offset(offset);
          return connectionQuery;
        }
        return null;
      }
    };
  }

  getAllWhere(whereArgs, args, context, ast) {
    if (!whereArgs) {
      return null;
    }

    const databaseInstance = this.tableInstance;
    const parsedAST = this.parseAST(ast);
    const sqlAST = this.generateSqlJoins(databaseInstance, args, context, parsedAST);
    const filterKeys = this.requestedFilterKeys(args.filter, sqlAST);

    whereArgs.forEach((arg) => {
      if (arg['person.id']) {
        databaseInstance.where('person_address.person_id', arg['person.id']);
      }

      if (arg['address.id']) {
        databaseInstance.where('person_address.address_id', arg['address.id']);
      }
    });

    if (filterKeys.has('date')) {
      databaseInstance.where('person_address.created', '<=', filterKeys.get('date')['__eq']);
      databaseInstance.where('person_address.expired', '>', filterKeys.get('date')['__eq']);
    } else if (context.date) {
      databaseInstance.where('person_address.created', '<=', context.date);
      databaseInstance.where('person_address.expired', '>', context.date);
    } else {
      databaseInstance.where('person_address.created', '<=', database.raw('CURRENT_TIMESTAMP(6)'));
      databaseInstance.where('person_address.expired', '>', database.raw('CURRENT_TIMESTAMP(6)'));
    }

    if (this.isUserOrGuest(context.request.user.accessLevel)) {
      const personId = fromGlobalId(context.request.user.personId).id.split(':');
      databaseInstance.whereIn('person_address.person_id', personId[0]);
    }

    return {
      sqlAST,
      countQuery: databaseInstance.clone(),
      availableFilters: this.getAvailableFilters(parsedAST, sqlAST, context),
      availableSorts: this.getAvailableSorts(parsedAST, sqlAST, context),
      dataQuery: (limit, offset) => {
        const connectionQuery = this.generateSqlSelect(databaseInstance, parsedAST, sqlAST, args, context);
        if (connectionQuery) {
          connectionQuery
            .limit(limit)
            .offset(offset);
          return connectionQuery;
        }
        return null;
      }
    };
  }

  async findById(id, context, ast) {
    const ids = id.split(':');
    const { query, sqlAST } = this.resolveModel(this.tableInstance, {}, context, this.parseAST(ast));

    if (query) {
      const row = await query
        .where('person_address.person_id', ids[0])
        .where('person_address.address_id', ids[1])
        .where('person_address.expired', ids.splice(2).join(':'));

      if (row.length) {
        return this.treeize(row, sqlAST, context)[0];
      }
    }

    return null;
  }
}

export default new PersonAddress({ type: personAddressType });
