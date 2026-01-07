const Geometry = {
    generatePolygon(sides, centerX, centerY, radius) {
        const points = [];
        const angleStep = (Math.PI * 2) / sides;
        const startAngle = Math.random() * Math.PI * 2;

        for (let i = 0; i < sides; i++) {
            const angle = startAngle + angleStep * i;
            const r = radius * (0.8 + Math.random() * 0.4);
            points.push({
                x: centerX + Math.cos(angle) * r,
                y: centerY + Math.sin(angle) * r
            });
        }

        return points;
    },

    generateRegularPolygon(sides, centerX, centerY, radius) {
        const points = [];
        const angleStep = (Math.PI * 2) / sides;
        const startAngle = -Math.PI / 2;

        for (let i = 0; i < sides; i++) {
            const angle = startAngle + angleStep * i;
            points.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
        }

        return points;
    },

    calculateArea(points) {
        let area = 0;
        const n = points.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }

        return Math.abs(area / 2);
    },

    lineIntersection(p1, p2, p3, p4, tolerance = 0.01) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (Math.abs(denom) < 0.00001) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= -tolerance && u <= 1 + tolerance) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }

        return null;
    },

    extendLine(line, polygon, extensionFactor = 1) {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const length = this.distance(line.end, line.start);

        if (length === 0) return line;

        const ndx = dx / length;
        const ndy = dy / length;

        const xs = polygon.map(p => p.x);
        const ys = polygon.map(p => p.y);
        const maxDim = Math.max(
            Math.max(...xs) - Math.min(...xs),
            Math.max(...ys) - Math.min(...ys)
        );

        const extension = maxDim * extensionFactor;

        return {
            start: {
                x: line.start.x - ndx * extension,
                y: line.start.y - ndy * extension
            },
            end: {
                x: line.end.x + ndx * extension,
                y: line.end.y + ndy * extension
            }
        };
    },

    findIntersection(extendedLine, polygon) {
        const intersections =  [];
        const n = polygon.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const edge = {
                start: polygon[i],
                end: polygon[j]
            };

            const intersection = this.lineIntersection(
                extendedLine.start, extendedLine.end,
                edge.start, edge.end
            );

            if (intersection) {
                let isDuplicate = false;
                for (const existing of intersections) {
                    if (this.distance(intersection, existing.point) < 10) {
                        isDuplicate = true;
                        break;
                    }
                }

                if (!isDuplicate) {
                    intersections.push({
                        point: intersection,
                        edgeIndex: i,
                        t: this.getParameterOnSegment(edge.start, edge.end, intersection)
                    });
                }
            }
        }
        return intersections
    },

    // Разделить многоугольник линией
    splitPolygon(polygon, line) {
        if (!polygon || polygon.length < 3) return null;

        // Расширяем линию, чтобы она гарантированно пересекала фигуру
        const extendedLine = this.extendLine(line, polygon);

        const intersections = this.findIntersection(extendedLine, polygon);
        const n = polygon.length;

        // Должно быть 2 или больше пересечений
        if (intersections.length !== 2) {
            console.log('Найдено пересечений:', intersections.length, 'нужно 2');
            return null;
        }

        const int1 = intersections[0];
        const int2 = intersections[1];

        // Создаём две части многоугольника
        const part1 = [];
        const part2 = [];


        // Обходим вершины многоугольника
        let currentEdge = int1.edgeIndex;

        //Создаём первую часть:
        part1.push(int1.point);

        // Добавляем конечную точку первого пересечённого ребра, если она не совпадает со вторым пересечением
        if (int1.edgeIndex !== int2.edgeIndex) {
            part1.push(polygon[(currentEdge + 1) % n]);
        }

        // Продолжаем обход до второго пересечения
        currentEdge = (currentEdge + 1) % n;

        while (currentEdge !== int2.edgeIndex) {
            part1.push(polygon[(currentEdge + 1) % n]);
            currentEdge = (currentEdge + 1) % n;
        }

        // Добавляем второе пересечение
        part1.push(int2.point);

        // Теперь создаём вторую часть
        // От второго пересечения обратно к первому
        part2.push(int2.point);

        if (int1.edgeIndex !== int2.edgeIndex) {
            part2.push(polygon[(int2.edgeIndex + 1) % n]);
        }

        currentEdge = (int2.edgeIndex + 1) % n;

        while (currentEdge !== int1.edgeIndex) {
            part2.push(polygon[(currentEdge + 1) % n]);
            currentEdge = (currentEdge + 1) % n;
        }

        part2.push(int1.point);

        // Проверяем валидность частей
        if (part1.length < 3 || part2.length < 3) {
            console.log('Невалидные части:', part1.length, part2.length);
            return null;
        }

        return [part1, part2];
    },

    getParameterOnSegment(p1, p2, point) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            return (point.x - p1.x) / dx;
        } else {
            return (point.y - p1.y) / dy;
        }
    },

    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Центр масс многоугольника
    getCentroid(points) {
        let cx = 0, cy = 0;
        const n = points.length;

        for (let i = 0; i < n; i++) {
            cx += points[i].x;
            cy += points[i].y;
        }

        return { x: cx / n, y: cy / n };
    },

    calculateAccuracy(parts) {
        if (parts.length < 2) return 0;

        const areas = parts.map(part => this.calculateArea(part));
        const avgArea = areas.reduce((a, b) => a + b, 0) / areas.length;

        const maxDeviation = Math.max(...areas.map(area =>
            Math.abs(area - avgArea) / avgArea
        ));

        return Math.max(0, 1 - maxDeviation);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Geometry;
}
