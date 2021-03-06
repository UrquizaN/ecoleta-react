import {Request, Response} from 'express';
import knex from '../database/connection';

class PointsController {
    async index(request: Request, response: Response) {
        const { city, uf, items } = request.query;

        const parsedItems = String(items)
            .split(',')
            .map( item => Number(item.trim()));

        const points = await knex('points')
            .join('point_items', 'points.id', '=', 'point_items.point_id')
            .whereIn('point_items.item_id', parsedItems)
            .where('city', String(city))
            .where('uf', String(uf))
            .distinct()
            .select('points.*');

        const serializedPoints = points.map(point => {
            return {
                ...point,
                image_url: `http://192.168.0.5:3333/uploads/${point.image}`,
            }
        });

        return response.json(serializedPoints);
    }

    async show(request: Request, response: Response) {
        const { id } = request.params; // const id = request.params.id;

        const point = await knex('points').where('id', id).first();

        if (!point) {
            return response.status(400).json({ message: 'Point not found!' });
        }

        /* 
        * SELECT * FROM items
        *  JOIN point_items ON items.id = point_items.items_id
        *   WHERE point_items.point_id = {id}
        */
       const serializedPoint = {
            ...point,
            image_url: `http://192.168.0.5:3333/uploads/${point.image}`,
        };
    
        const items = await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title');

        return response.json({ point: serializedPoint, items});
    }

    async create (request: Request, response: Response) {
        // Garante que se uma insersão falhar, a outra também falhe (roll back)
        const trx = await knex.transaction();
    
        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = request.body;
        
        const point = {
            image: request.file.filename,
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf
        };

        const insertedIds = await trx('points').insert(point);
    
        // Armazena os ids dos items e o id do point
        const point_id = insertedIds[0];

        const pointItems = items
        .split(',')
        .map((item: string) => Number(item.trim()))
        .map((item_id: number) => {
            return {
                item_id,
                point_id,
            };
        });
    
        // Criando o relacionamento entre a tabela points e items através da tabela point_items
        await trx('point_items').insert(pointItems);
    
        // Faz as inserções no BD
        await trx.commit();

        return response.json({
            id: point_id,
            ...point,
        });
    }
}

export default PointsController;