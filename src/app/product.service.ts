import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  // Relative URL — nginx proxies /api to the backend service inside the cluster.
  // This works identically in local Docker and in Kubernetes.
  private readonly base = '/api/products';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.base);
  }

  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.base, product);
  }

  update(product: Product): Observable<void> {
    return this.http.put<void>(`${this.base}/${product.id}`, product);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
